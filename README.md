# DIDLab IBS — Intent-Bound Signing research

Reproducible testbed and research network for studying **signing-path compromise** of custodial
hot wallets (the Oct 29, 2026 Binance pattern: the attacker controls orchestration and makes the
custodian's own signer sign, including EIP-7702 delegations) and **Intent-Bound Signing (IBS)**
defenses.

| Folder | What it is | Needs |
|---|---|---|
| [`testbed/`](testbed/) | In-process simulator (Hardhat EDR, Prague): incident replay, 4 attacker models, IBS control configurations R0–R4 | Node 20+ |
| [`research-net/`](research-net/) | 4-validator Hyperledger Besu QBFT network with Prague enabled (chain 252701), plus an EIP-7702 smoke test | Docker + Compose, Node 20+ |
| [`infra/proxmox/`](infra/proxmox/) | Script that provisions the Ubuntu 24.04 VM hosting the research network on Proxmox VE | Proxmox host |

## Quick start (5 minutes, laptop only)

```bash
git clone <repo-url> didlab-ibs && cd didlab-ibs/testbed
npm ci
npm run sim:quick          # one short run: full IBS (R4) against the incident replay (A1)
node sim.mjs R0            # all incident-baseline runs
```

## Real-client validation (Besu)

```bash
cd research-net
./setup.sh                 # generates 4 validator keys + genesis (local only, git-ignored)
docker compose up -d
npm ci && npm run smoke    # forks, system contracts, full EIP-7702 delegate → sweep → revoke cycle
```

See [`research-net/README.md`](research-net/README.md) for design decisions and isolation rules.
The research network is **never** connected to the DIDLab production chain (252501).

## Repository rules

- **Nothing generated is committed:** validator keys, `networkFiles/`, generated genesis, `.env`,
  `node_modules/`, and ad-hoc run outputs are git-ignored. Curated results go under
  `testbed/results/<date>/` with the command that produced them.
- **Test keys only.** Funded accounts use keys derived from public labels (`keccak256("sigsim:<label>")`).
  They are for isolated test networks and must never hold real value.
- **Pinned versions:** Besu `26.8.0`, solc `0.8.28`, viem `2.57.13`, Hardhat 2.x (see lockfiles).
- **CI** runs the quick simulation and the smoke test on every push.

## Status

Pre-publication research code (v0.1). Licensing will be added before the repository is made public.
If you use this work, see [`CITATION.cff`](CITATION.cff).
