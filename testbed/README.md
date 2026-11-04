# Signing-path compromise testbed (prototype)

Simulation of the Oct 29, 2026 Binance hot-wallet attack and of Intent-Bound Signing (IBS)
defenses. Runs in-process on Hardhat EDR (default) or against any JSON-RPC chain, such as the
Besu research network in [`../research-net`](../research-net).

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

Multiple seeds: `SEEDS=7,8,9,10,11 node sim.mjs R4` (default seed 7 reproduces the Oct 30 runs).

Results go to `results*.json` in this folder (git-ignored), as `{ meta, results }`.
Curated runs live in `results/<date>/` (the Oct 30 files predate `meta` and are a plain array).

## Backends

| | `BACKEND=hardhat` (default) | `BACKEND=rpc RPC=<url>` |
|---|---|---|
| Chain | in-process Hardhat EDR, Prague | any JSON-RPC node (Besu research network: `http://127.0.0.1:18545`) |
| One step | one manually mined block; every tx mined on send | one real block (2 s on the research network) |
| Between runs | snapshot / revert | fresh actor keys `sigsim:<runTag>:<label>`, funded from the faucet `FAUCET_KEY` (default `keccak256("sigsim:faucet")`) |
| Extra output | — | `timing`: detection/containment in blocks and seconds after t0; step overruns |

```
BACKEND=rpc RPC=http://127.0.0.1:18545 node sim.mjs =R4-A1     # one run on Besu (~45 min at 2 s blocks)
```

To test the rpc path without Besu, use a local interval-mined node:

```
MINING_INTERVAL=500 npx hardhat --config hardhat.rpc-test.config.js node --port 8599
BACKEND=rpc RPC=http://127.0.0.1:8599 HORIZON=230 node sim.mjs =R2-A1
```

## Model

- One step = one block (12 s in the incident timeline). t0 = the EIP-7702 delegation (20:20:59 UTC in the incident).
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
issuer freezes, swaps and laundering not modelled. Seeds 7–11 on Hardhat change no outcome
(`results/2026-11-04-hardhat-5seeds/`); Besu has seed 7 only. Full list: `docs/SCOPE_AND_LIMITATIONS.md`.
