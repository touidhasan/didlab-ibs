# Smoke test on Besu — 2026-10-31

Host: `didlab-research` VM (Proxmox VMID 180, 4 vCPU / 16 GB / 100 GB, Ubuntu 24.04.5, kernel 6.8.0-147).
Network: 4 validators, chain 252701, genesis generated 2026-10-31 19:54 UTC with `setup.sh` at commit 2fbf218.
Command: `npm ci && npm run smoke` (in `research-net/`).

```
PASS  chain id  — got 252701, expected 252701
INFO  client  — besu/v26.8.0/linux-x86_64/openjdk-java-25
PASS  London active (baseFeePerGas present)  — baseFee=0x0
PASS  Shanghai active (withdrawalsRoot present)
PASS  Cancun active (parentBeaconBlockRoot present)
PASS  Prague active (requestsHash present)
INFO  block period  — 2.00 s (genesis setting: 2 s)
PASS  system contract EIP-4788 beacon roots  — 97 bytes
PASS  system contract EIP-2935 history storage  — 83 bytes
PASS  system contract EIP-7002 withdrawal requests  — 504 bytes
PASS  system contract EIP-7251 consolidation requests  — 414 bytes
PASS  funder has balance  — 0x1dd9df8b2595baAEA98F925280DeaB8A5A0D1aE0 1000000
INFO  deploy Sweeper  — status=success block=187 (+1 blocks, 0.8 s) gas=347916
PASS  contract deployed (Prague bytecode)
INFO  fund EOA  — status=success block=188 (+1 blocks, 2.0 s) gas=21000
INFO  type-4 delegate  — status=success block=189 (+1 blocks, 2.1 s) gas=36844
PASS  EOA code is 0xef0100||delegate  — 0xef0100671d236a74b8f351df780ca0942b6dec272d449d
PASS  delegation tx type is 0x4
INFO  sweep via delegated code  — status=success block=190 (+1 blocks, 1.8 s) gas=29247
PASS  sweep left exactly 1 TRUST  — 1
INFO  type-4 revoke  — status=success block=191 (+1 blocks, 2.0 s) gas=36800
PASS  EOA code cleared after revoke  — 0x

ALL CHECKS PASSED
```

## Observations

- Gas used by every transaction is identical to the Hardhat EDR run of the same script
  (deploy 347,916; delegate 36,844; sweep 29,247; revoke 36,800): first sim-to-real fidelity data point.
- Every transaction was included in the next block (~2 s), versus instant automine on Hardhat.
- Block production observed at a steady 2.00 s with round-robin proposers across all 4 validators.
- Single run, single seed; timing figures are indicative only.
