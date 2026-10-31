# Backend equivalence check — 2026-10-31

Purpose: confirm that the `BACKEND=rpc` port (real blocks, fresh accounts per run, nonce tracker)
produces the same outcomes as the in-process Hardhat backend before running campaigns on Besu.

**1. Hardhat regression.** `node sim.mjs` (all 33 runs, seed 7) after the port: all 33 runs identical to
`../2026-10-30/all_results.json` on loss, detection, containment, delegated blocks, alerts, benign
outcomes and signer denials.

**2. rpc vs Hardhat.** rpc runs against a local interval-mined node
(`MINING_INTERVAL=500 npx hardhat --config hardhat.rpc-test.config.js node --port 8599`, 0.5 s blocks,
no automine), compared with Hardhat at the same horizon. Command: `BACKEND=rpc RPC=http://127.0.0.1:8599 HORIZON=230 node sim.mjs =<id>`.

| Run | rpc loss | Hardhat loss | Detect / contain (step) | Benign completed/blocked | rpc step overruns |
|---|---|---|---|---|---|
| R0-A1 | $2,998.5M | $2,998.5M | — / — | 316 / 0 (both) | 0 / 291 |
| R0-A2 | $3,036.5M | $3,036.5M | — / — | 316 / 0 (both) | 0 / 291 |
| R2-A1 | $0.0M | $0.0M | 0 / 0 (both) | 64 / 252 (both) | 0 / 291 |
| R3-A3 | $24.0M | $24.0M | 0 / 0 (both) | 64 / 252 (both) | 0 / 291 |
| R4-A1 (HORIZON=40) | $0.0M | $0.0M | −16 / −16 (both) | 48 / 55 (both) | 0 / 101 |

rpc-only timing (R2-A1): detection 0.55 s and containment 0.57 s after t0 at 0.5 s blocks.
Files: `rpc-<id>.json` (`{ meta, results }`).

Limits: one seed; local stand-in node, not Besu; horizon 230 covers the delegation, the first three sweeps
and both pulls but not the 884/1076 events. The Besu runs are the next step.
