# Signing-path compromise testbed (prototype)

Local-devnet simulation of the Oct 29, 2026 Binance hot-wallet attack and of
Intent-Bound Signing (IBS) defenses. Built Oct 30, 2026 as preliminary evidence
for the research proposal. Runs only against an in-process Hardhat devnet.

## Requirements

Node.js 20+ and npm. No internet access is needed after install.

```
npm ci
```

## Run

```
node sim.mjs              # full matrix (33 runs, ~15-20 min)
node sim.mjs R4           # all runs whose id starts with R4
node sim.mjs =R4t-A3      # exactly one run
HORIZON=300 node sim.mjs =R0-A1   # shorter horizon (steps after t0)
```

Results go to `results*.json` in this folder (git-ignored). The curated Oct 30 runs are in `results/2026-10-30/`.

## Model

- One step = 12 s. t0 = the EIP-7702 delegation (20:20:59 UTC in the incident).
  60 warm-up steps, 1,200 attack steps.
- Wallets are funded to the incident's Ethereum-leg balances.
- Manual response from the incident applies to every configuration:
  customer withdrawals paused at step 570; access cut and delegation revoked at step 1,149.

Configurations:

| Id  | Controls |
|-----|----------|
| R0  | Signer signs any authenticated request (the incident) |
| R1  | C2 semantic policy + C3 budgets ($1M per tx, $25M per hour) |
| R2  | C4 reconciling watcher + automatic containment |
| R3  | C2 + C3 + C4 |
| R4  | C1 intent binding + C2 + C3 + C4 |
| R4t | R4 with tiered response (refused requests alert but do not freeze) |
| *p  | Signer unfrozen 30 min after containment while the attacker keeps access |

Attackers: A1 incident replay, A2 blitz (atomic delegation+sweep, all drains in one step),
A3 policy-aware (no EIP-7702, max-size plain transfers), A4 = A3 + intent authority compromised.

## Files

- `contracts.sol`: mock stablecoins with issuer freeze, operator smart wallet, attacker sweeper.
- `sim.mjs`: signer, intent authority, pipeline, exchange automation, attacker, watcher, experiment matrix.
- `hardhat.config.js`: Prague hardfork, zero base fee.

## Known limits

Single EVM chain; software signer (no HSM/MPC/TEE); scripted attackers; synthetic traffic;
issuer freezes, swaps and laundering not modelled; single random seed.
