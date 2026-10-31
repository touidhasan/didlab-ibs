#!/usr/bin/env bash
# didlab-research: create (or destroy) the VM that hosts the DIDLab research network (chain 252701).
#
# Run as root on the Proxmox host:
#   ./provision-research-vm.sh create
#   ./provision-research-vm.sh destroy
#
# Creates an Ubuntu 24.04 cloud-image VM on vmbr1 with a static address, then lets cloud-init
# install Docker (with Compose), Node.js 22, chrony, Tailscale and a host firewall, and pre-pulls the
# Besu image. Nothing is published to the internet: no nginx, no cloudflared, SSH only from the lab
# subnet and the tailnet. No secrets are written anywhere: you join Tailscale on the VM afterwards.
#
# Defaults follow the DIDLab address plan (app .10, dapp .20, ops .30, auth .40, apl-core .50, fl .60,
# research .80). Every setting can be overridden from the environment, e.g. VMID=181 VM_IP=172.16.0.81.
set -euo pipefail

VMID="${VMID:-180}"
VM_NAME="${VM_NAME:-didlab-research}"      # also the VM hostname
BRIDGE="${BRIDGE:-vmbr1}"
VM_IP="${VM_IP:-172.16.0.80}"
CIDR="${CIDR:-24}"
GATEWAY="${GATEWAY:-}"                     # default: the host's own address on $BRIDGE
DNS="${DNS:-1.1.1.1 8.8.8.8}"
ADMIN_SUBNET="${ADMIN_SUBNET:-172.16.0.0/24}"  # SSH allowed from here (and from the tailnet)
CORES="${CORES:-4}"
MEMORY_MB="${MEMORY_MB:-16384}"
DISK_GB="${DISK_GB:-100}"
STORAGE="${STORAGE:-local-lvm}"
SNIPPET_STORAGE="${SNIPPET_STORAGE:-local}"
CI_USER="${CI_USER:-didlab}"
SSH_PUBKEY_FILE="${SSH_PUBKEY_FILE:-/root/.ssh/authorized_keys}"
BESU_IMAGE="${BESU_IMAGE:-hyperledger/besu:26.8.0}"   # set to the exact image production runs
NODE_MAJOR="${NODE_MAJOR:-22}"
IMAGE_BASE="${IMAGE_BASE:-https://cloud-images.ubuntu.com/noble/current}"
IMAGE_FILE="${IMAGE_FILE:-noble-server-cloudimg-amd64.img}"
IMAGE_DIR="${IMAGE_DIR:-/var/lib/vz/template/iso}"
BOOT_TIMEOUT_MIN="${BOOT_TIMEOUT_MIN:-25}"

SNIPPET_NAME="${VM_NAME}-vendor.yaml"

log()  { printf '\n==> %s\n' "$*"; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

require_root_on_proxmox() {
  [[ $EUID -eq 0 ]] || die "run as root on the Proxmox host"
  if ! command -v qm >/dev/null || ! command -v pvesm >/dev/null; then die "qm/pvesm not found: is this the Proxmox host?"; fi
}

snippet_path() { pvesm path "${SNIPPET_STORAGE}:snippets/${SNIPPET_NAME}"; }

preflight() {
  log "Preflight checks"
  qm status "$VMID" >/dev/null 2>&1 && die "VMID $VMID already exists (set VMID=... to choose another)"
  qm list | awk 'NR>1{print $2}' | grep -qx "$VM_NAME" && die "a VM named $VM_NAME already exists"
  ip link show "$BRIDGE" >/dev/null 2>&1 || die "bridge $BRIDGE not found"
  if ping -c1 -W1 "$VM_IP" >/dev/null 2>&1; then die "$VM_IP answers ping: address already in use"; fi
  pvesm status | awk 'NR>1{print $1}' | grep -qx "$STORAGE" || die "storage $STORAGE not found"
  pvesm status --content snippets | awk 'NR>1{print $1}' | grep -qx "$SNIPPET_STORAGE" \
    || die "storage $SNIPPET_STORAGE does not allow snippets. Enable with: pvesm set $SNIPPET_STORAGE --content <existing>,snippets"
  [[ -s "$SSH_PUBKEY_FILE" ]] || die "no SSH public key at $SSH_PUBKEY_FILE (set SSH_PUBKEY_FILE=...)"
  if [[ -z "$GATEWAY" ]]; then
    GATEWAY="$(ip -4 -o addr show "$BRIDGE" | awk '{print $4}' | cut -d/ -f1 | head -1)"
    [[ -n "$GATEWAY" ]] || die "could not read $BRIDGE's address; set GATEWAY=..."
  fi
  echo "VM $VMID '$VM_NAME': ${CORES} vCPU, ${MEMORY_MB} MB, ${DISK_GB} GB on $STORAGE"
  echo "Network: $VM_IP/$CIDR via $GATEWAY on $BRIDGE, DNS $DNS; SSH from $ADMIN_SUBNET + tailnet"
  echo "Besu image to pre-pull: $BESU_IMAGE"
}

fetch_image() {
  log "Ubuntu cloud image"
  mkdir -p "$IMAGE_DIR"
  local sums; sums="$(mktemp)"
  curl -fsSL "$IMAGE_BASE/SHA256SUMS" -o "$sums"
  local expected; expected="$(grep " \*\?$IMAGE_FILE\$" "$sums" | awk '{print $1}')"
  rm -f "$sums"
  [[ -n "$expected" ]] || die "no checksum for $IMAGE_FILE in SHA256SUMS"
  if [[ -f "$IMAGE_DIR/$IMAGE_FILE" ]] && echo "$expected  $IMAGE_DIR/$IMAGE_FILE" | sha256sum -c --quiet 2>/dev/null; then
    echo "cached image is current"
  else
    echo "downloading $IMAGE_FILE"
    curl -fL --progress-bar "$IMAGE_BASE/$IMAGE_FILE" -o "$IMAGE_DIR/$IMAGE_FILE.part"
    echo "$expected  $IMAGE_DIR/$IMAGE_FILE.part" | sha256sum -c --quiet || die "checksum mismatch"
    mv "$IMAGE_DIR/$IMAGE_FILE.part" "$IMAGE_DIR/$IMAGE_FILE"
  fi
}

write_vendor_snippet() {
  log "cloud-init vendor data (packages only, no secrets)"
  local path; path="$(snippet_path)"
  cat > "$path" <<EOF
#cloud-config
package_update: true
package_upgrade: true
timezone: UTC
packages:
  - qemu-guest-agent
  - ca-certificates
  - curl
  - gnupg
  - jq
  - git
  - rsync
  - unzip
  - chrony
  - ufw
  - unattended-upgrades
runcmd:
  - systemctl enable --now qemu-guest-agent
  # Accurate time matters: QBFT block timestamps and our latency measurements depend on it
  - systemctl enable --now chrony
  # Docker Engine + Compose plugin from Docker's official apt repository
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  - chmod a+r /etc/apt/keyrings/docker.asc
  - sh -c 'echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo \$VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list'
  # Node.js ${NODE_MAJOR} from NodeSource's apt repository (runs the testbed and smoke test)
  - sh -c 'curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg'
  - sh -c 'echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list'
  - apt-get update
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nodejs
  - usermod -aG docker ${CI_USER}
  # Tailscale (official installer); joining the tailnet is done by hand afterwards
  - sh -c 'curl -fsSL https://tailscale.com/install.sh | sh'
  # Host firewall: SSH from the lab subnet and the tailnet only; nothing else inbound.
  # (Research RPC/metrics are published on 127.0.0.1 only, so Docker's own iptables rules expose nothing.)
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow from ${ADMIN_SUBNET} to any port 22 proto tcp
  - ufw allow in on tailscale0
  - ufw --force enable
  # Pre-pull the Besu image so the research network starts without a download
  - docker pull ${BESU_IMAGE}
  - install -d -o ${CI_USER} -g ${CI_USER} -m 0750 /opt/didlab-research
  - touch /var/lib/cloud/instance/didlab-bootstrap-done
EOF
  echo "wrote $path"
}

create_vm() {
  log "Creating VM $VMID"
  qm create "$VMID" --name "$VM_NAME" --ostype l26 --cpu host --cores "$CORES" --memory "$MEMORY_MB" \
    --net0 "virtio,bridge=$BRIDGE" --scsihw virtio-scsi-single --agent enabled=1 \
    --serial0 socket --vga serial0 --onboot 1 --tags "didlab;research"
  qm set "$VMID" --scsi0 "${STORAGE}:0,import-from=${IMAGE_DIR}/${IMAGE_FILE},discard=on,ssd=1"
  qm resize "$VMID" scsi0 "${DISK_GB}G"
  qm set "$VMID" --ide2 "${STORAGE}:cloudinit" --boot order=scsi0
  qm set "$VMID" --ciuser "$CI_USER" --sshkeys "$SSH_PUBKEY_FILE" \
    --ipconfig0 "ip=${VM_IP}/${CIDR},gw=${GATEWAY}" --nameserver "$DNS" \
    --cicustom "vendor=${SNIPPET_STORAGE}:snippets/${SNIPPET_NAME}"
  qm start "$VMID"
}

guest_out() {  # run a command in the guest, print its stdout (empty on failure)
  qm guest exec "$VMID" --timeout 30 -- "$@" 2>/dev/null \
    | sed -n 's/.*"out-data"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | sed 's/\\n/\n/g'
}

wait_for_bootstrap() {
  log "Waiting for cloud-init (up to ${BOOT_TIMEOUT_MIN} min)"
  local deadline=$(( $(date +%s) + BOOT_TIMEOUT_MIN * 60 ))
  until qm guest cmd "$VMID" ping >/dev/null 2>&1; do
    (( $(date +%s) < deadline )) || die "guest agent never answered; check the VM console"
    sleep 10
  done
  echo "guest agent up"
  local status=""
  while :; do
    status="$(guest_out cloud-init status || true)"
    if grep -q 'status: done' <<<"$status"; then break; fi
    if grep -q 'status: error' <<<"$status"; then
      die "cloud-init reported an error. On the VM: sudo cloud-init status --long; sudo tail -100 /var/log/cloud-init-output.log"
    fi
    (( $(date +%s) < deadline )) || die "cloud-init still running after ${BOOT_TIMEOUT_MIN} min"
    sleep 15
  done
  guest_out ls /var/lib/cloud/instance/didlab-bootstrap-done | grep -q didlab-bootstrap-done \
    || die "bootstrap marker missing: an install step failed (see /var/log/cloud-init-output.log on the VM)"
  echo "bootstrap complete"
}

verify() {
  log "Verifying installed tools"
  for c in "docker --version" "docker compose version" "node --version" "npm --version" "tailscale version" "ufw status"; do
    # shellcheck disable=SC2086
    printf '  %-26s %s\n' "$c" "$(guest_out $c | head -1)"
  done
  printf '  %-26s %s\n' "chrony offset" "$(guest_out chronyc tracking | grep -m1 'System time')"
  printf '  %-26s %s\n' "besu image" "$(guest_out docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -m1 besu || echo 'MISSING')"
}

snapshot_baseline() {
  log "Snapshot 'post-bootstrap'"
  qm snapshot "$VMID" post-bootstrap --description "clean VM after cloud-init, before research network" \
    || echo "WARNING: snapshot failed (storage $STORAGE may not support snapshots); continuing"
}

next_steps() {
  cat <<EOF

Done. VM $VMID '$VM_NAME' is at $VM_IP.

Next, on the VM (ssh ${CI_USER}@${VM_IP}):
  1. Stop cloud-init re-running on later boots:  sudo touch /etc/cloud/cloud-init.disabled
  2. Join the tailnet:                           sudo tailscale up --hostname=${VM_NAME}
  3. Copy the research kit from your machine:    scp didlab-research-net.zip ${CI_USER}@${VM_IP}:/opt/didlab-research/
     then on the VM:                             cd /opt/didlab-research && unzip didlab-research-net.zip && cd research-net
  4. Follow research-net/README.md "Steps" (IMAGE=${BESU_IMAGE} ./setup.sh, docker compose up -d, smoke test).
  5. When the smoke test passes, on the Proxmox host:  qm snapshot ${VMID} research-baseline
EOF
}

destroy_vm() {
  qm status "$VMID" >/dev/null 2>&1 || die "VMID $VMID does not exist"
  local name; name="$(qm config "$VMID" | awk -F': ' '/^name:/{print $2}')"
  [[ "$name" == "$VM_NAME" ]] || die "VMID $VMID is '$name', not '$VM_NAME': refusing to destroy"
  read -r -p "Type the VM name to destroy it ($VM_NAME): " answer
  [[ "$answer" == "$VM_NAME" ]] || die "aborted"
  log "Destroying VM $VMID"
  qm stop "$VMID" --skiplock 1 >/dev/null 2>&1 || true
  qm destroy "$VMID" --purge 1 --destroy-unreferenced-disks 1
  rm -f "$(snippet_path)"
  echo "VM and snippet removed."
}

main() {
  require_root_on_proxmox
  case "${1:-}" in
    create)  preflight; fetch_image; write_vendor_snippet; create_vm; wait_for_bootstrap; verify; snapshot_baseline; next_steps ;;
    destroy) destroy_vm ;;
    *) echo "usage: $0 create|destroy" >&2; exit 2 ;;
  esac
}

main "$@"
