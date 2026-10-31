#!/usr/bin/env bash
# DIDLab research network (chain 252701) — one-time key + genesis generation.
# Creates: networkFiles/ (raw Besu output), config/genesis.json, config/static-nodes.json,
#          nodes/node1..4/{key,key.pub,data/}, .env
# Safe to read before running: it only writes inside this folder.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE="${IMAGE:-hyperledger/besu:26.8.0}"   # use the same image name/tag production uses (see README step 1)
SUBNET_PREFIX="${SUBNET_PREFIX:-10.252.70}" # private docker subnet; must not clash with existing networks

if [ -e networkFiles ] || [ -e nodes ]; then
  echo "networkFiles/ or nodes/ already exists. Remove both to regenerate (this creates a NEW chain)." >&2
  exit 1
fi

echo "== Generating 4 validator keys and genesis with $IMAGE"
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" -w /work --entrypoint besu "$IMAGE" \
  operator generate-blockchain-config \
  --config-file=/work/qbftConfigFile.json \
  --to=/work/networkFiles \
  --private-key-file-name=key

mkdir -p config
cp networkFiles/genesis.json config/genesis.json

echo "== Arranging node folders and static peers"
enodes=()
i=1
for d in networkFiles/keys/0x*; do
  mkdir -p "nodes/node$i/data"
  cp "$d/key" "$d/key.pub" "nodes/node$i/"
  chmod 600 "nodes/node$i/key"
  pub="$(tr -d '\n' < "$d/key.pub")"; pub="${pub#0x}"
  enodes+=("\"enode://${pub}@${SUBNET_PREFIX}.$((10 + i)):30303\"")
  echo "node$i  validator $(basename "$d")"
  i=$((i + 1))
done
( IFS=,; echo "[${enodes[*]}]" ) > config/static-nodes.json

cat > .env <<EOF
IMAGE=${IMAGE}
SUBNET_PREFIX=${SUBNET_PREFIX}
UID_GID=$(id -u):$(id -g)
EOF

echo "== Done. Review config/genesis.json, then: docker compose up -d"
