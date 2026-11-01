# Besu core-15 campaign, seed 7, full horizon (2026-11-01)

**Question.** Do the 15 core runs give the same outcomes on a real client as on the Hardhat simulator
(the 2026-10-30 matrix)?

## Setup

| Item | Value |
|---|---|
| Campaign | `c20261101013046-deed4d`, "Besu core 15, full horizon, seed 7" |
| Client | Hyperledger Besu 26.8.0 (`besu/v26.8.0/linux-x86_64/openjdk-java-25`) |
| Network | Research network 252701: 4 QBFT validators, 2 s blocks, Prague at genesis |
| Simulator | commit `953a74d` (clean), `sim.mjs` sha256 `466fb98c…87ec`, Node v22.23.4, host `didlab-research` |
| Runs | R0–R4 × A1–A3, seed 7, horizon 1,200 steps after t0 (1,261 steps with warm-up), per-step trace on |
| Wall time | 01:30:46Z – 09:28:35Z, one run at a time |
| Baseline | Hardhat in-process, `../2026-10-30/all_results.json` (same seed and horizon) |

Files: `besu-core15-s7.json.gz` (campaign, run metadata and full results with traces),
`hardhat-R0-A3-trace.json.gz` (Hardhat rerun of R0-A3 with trace, for the comparison below),
`failed-runs.log` (stderr of the five failed runs).

## Results

| Run | Hardhat loss | Besu loss | Same outcome? | Detect / contain (step) | Besu detect / contain after t0 (s) | Benign landed / sent (Besu) |
|---|---|---|---|---|---|---|
| R0-A1 | $3,243.8M | failed (null `eth_getBalance`, step 550) | — | — | — | — |
| R0-A2 | $3,243.8M | failed (null `eth_getBalance`, step 210) | — | — | — | — |
| R0-A3 | $2,421.2M | $2,218.6M | **no (−$202.6M)** | — / — | — | 140 / 727 |
| R1-A1 | $95.8M | $95.8M | yes | — / — | — | 268 / 268 |
| R1-A2 | $95.8M | $95.8M | yes | — / — | — | 268 / 268 |
| R1-A3 | $95.8M | failed (null `eth_getBalance`, step 530) | — | — | — | — |
| R2-A1 | $0.0M | $0.0M | yes | 0 / 0 | 2.04 / 2.04 | 113 / 114 |
| R2-A2 | $2,209.7M | $2,209.7M | yes (+$664) | 0 / 0 | 2.04 / 2.05 | 64 / 114 |
| R2-A3 | $2,209.7M | $2,209.7M | yes (+$664) | 0 / 0 | 2.04 / 2.05 | 65 / 114 |
| R3-A1 | $0.0M | failed (null `eth_getBalance`, step 300) | — | — | — | — |
| R3-A2 | $0.0M | failed (Node.js V8 fatal error at start) | — | — | — | — |
| R3-A3 | $24.0M | $24.0M | yes | 0 / 0 | 0.06 / 2.00 | 114 / 114 |
| R4-A1 | $0.0M | $0.0M | yes | −16 / −16 | −31.95 / −29.91 | 98 / 98 |
| R4-A2 | $0.0M | $0.0M | yes | −16 / −16 | −31.92 / −30.00 | 98 / 98 |
| R4-A3 | $0.0M | $0.0M | yes | 0 / 0 | 0.01 / 1.94 | 114 / 114 |

"Same outcome" compares loss by asset, detection and containment step, loss at first containment,
delegated blocks, benign completed/blocked/paused, signer denials and alert counts.

## Findings

**1. Every completed run with IBS controls (R1–R4, 9 runs) matches Hardhat.** Seven match exactly.
R2-A2 and R2-A3 differ by $664: one 0.289 ETH customer withdrawal sent in the attack block executed
on Hardhat but never landed on Besu once the wallet had been emptied, so the attacker took it.

**2. The unprotected baseline R0-A3 does not match: Besu loses $202.6M (8.4%) less.** The difference is
200,000,000 USDT plus 1,151 ETH. The per-step traces show why:

- At step 18 a customer withdrawal from hot wallet 14 exceeded its balance (about 1 ETH). Hardhat
  rejected it at submission. Besu admitted it to the mempool, so every later transaction from that
  wallet — customer withdrawals and the attacker's transfers alike — queued behind nonce 74.
- The 1,700 ETH replenishment scheduled at step 200 made nonce 74 payable, and in the next block 170
  queued transactions executed in nonce order. The attacker's collection address gained nothing:
  about 611 ETH went to queued customer withdrawals and about 1,090 ETH stayed in the wallet.
  On Hardhat the attacker took about 1,698 ETH at this point.
- The wallet stalled again at nonce 244 until step 1,071. The 370 ETH (step 400) and 200M USDT
  (step 411) replenishments arrived during the stall. On Besu the 200M USDT was never taken; the ETH
  was partly taken when the queue cleared at step 1,071. On Hardhat the attacker took both as they
  arrived.

This is limitation E8 again: the outcome depends on the client's admission rule for transactions the
sender cannot yet pay for (mpfuzz calls these overdraft and latent-overdraft transactions; see
`survey/notes/wang2024mpfuzz.md`). Neither number is "the" true baseline. Our A3 attacker does not
notice a stalled nonce; a real attacker controlling the orchestration would replace the stuck
transaction (same nonce, higher fee) and get closer to the Hardhat figure.

**3. Detection and containment take one block on real 2 s blocks.** Watcher-only containment (R2)
fired 2.04–2.05 s after t0 in all three runs. With signer-side controls (R3-A3, R4-A3) the first alert
came 0.01–0.06 s after t0, before the attack block, and containment landed in the next block
(1.94–2.00 s). In R4-A1 and R4-A2 the signer refused the attacker's staging (a type-4 authorization)
16 steps before t0, so detection and containment are negative: about 32 s and 30 s before t0.
(Containment is decided in step −16 and lands in block −15, hence the step and seconds columns differ
by one block.)

**4. Containment alone cannot stop a one-block drain.** R2-A2 and R2-A3 were contained after 2.05 s
yet lost $2,209.7M, because the drain executed in the attack block itself. Only the configuration
that refuses the request before signing (R4) stops it, on both backends. This is the empirical case for
combining C1/C2 with C4.

**5. The simulator kept pace with the chain.** 12,610 steps across the 10 completed runs, zero
overruns, never more than one block per step.

## Failures (5 of 15 runs)

- **Four runs stopped on a null `eth_getBalance`.** Besu returned `result: null` for a balance query at
  `latest` (steps 550, 210, 530, 300), which the JSON-RPC specification does not allow and our client
  could not convert. Cause not established; four occurrences in about 8 h. Recorded as limitation E13.
  **Fix:** the rpc backend now retries state reads that must never be null (balance, nonce, code,
  call, storage) with backoff, and counts every occurrence in `timing.rpc` so it is reported, not
  hidden. Tested with a fault-injecting proxy (`testbed/tools/nullproxy.mjs`): 123 injected nulls, all
  recovered, outcomes identical to a direct run. The same test now runs in CI.
- **One run (R3-A2) crashed Node.js at start-up** with V8 internal check failures in the optimizing
  compiler (SIGTRAP), 5 s into the run, before any chain interaction. Not reproduced. If it recurs,
  check the VM's memory and try another Node 22 patch release. Recorded under E14.
- **Rule (E14).** A failed run is rerun with the same parameters, and both attempts are reported.
  Failed runs are never dropped silently.

## Also changed

- Customer withdrawals rejected at submission now record the client's error message
  (`benignLanded.rejectReasons`). On Besu, R0-A3 had 280 such rejections late in the run, while the
  wallet was stalled. This fits Besu's layered pool, which by default keeps at most 200 sequential
  transactions per sender (`--tx-pool-max-future-by-sender`); the next runs will show the actual reason.
- Each rpc run now records the client's txpool size at start and end (`timing.txpool`). Stuck
  transactions from earlier runs stay in Besu's layered pool, which drops old transactions only when its
  memory limit is reached, so later runs start with a non-empty pool (limitation E15). The node log
  showed 438–452 pending transactions during R0-A1; the dashboard showed 988 after the campaign.

## Besu log around the R0-A1 failure (01:49Z)

No warnings or errors. Two observations, not yet a diagnosis:
- Block 9,261 (01:49:35) was imported by the block-propagation path (`PersistBlockTask`) instead of
  the QBFT processor, the only such import in that minute.
- The process exited at 01:49:39.015, 2 ms after node1 logged the import of block 9,263. That is
  consistent with a state read at `latest` racing the head update.
The other three failure windows are needed before calling either a cause.

## Next

1. On the VM: `git pull`, restart the four Besu nodes (clears the txpool; chain data is kept), then rerun
   the five failed runs (R0-A1, R0-A2, R1-A3, R3-A1, R3-A2) as a new campaign with the same settings.
2. Hardhat multi-seed campaign (seeds 7–11, horizon 1,200, trace on).
3. Add attacker variant A3r, which replaces a stalled nonce, so the baseline no longer depends on the
   attacker missing the stall. Report R0 as a range until then.
