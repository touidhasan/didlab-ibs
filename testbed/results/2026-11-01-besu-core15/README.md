# Besu core-15 comparison, seed 7, full horizon (2026-11-01)

**Question.** Do the 15 core runs give the same outcomes on a real client as on the Hardhat simulator
(the 2026-10-30 matrix)?

**Answer.** Yes for every run with IBS controls (12 of 12). No for the unprotected baseline (3 of 3):
Besu reports lower losses, because of how its mempool handles transactions the sender cannot yet pay
for (limitation E8).

## Setup

| Item | First campaign | Rerun of its 5 failed runs |
|---|---|---|
| Campaign | `c20261101013046-deed4d` | `c20261101173932-a2abe7` |
| Runs | all 15 (10 completed, 5 failed) | R0-A1, R0-A2, R1-A3, R3-A1, R3-A2 (all completed) |
| Simulator commit | `953a74d` (clean) | `207fef1` (clean): adds null-read retry, send-error reasons, txpool size |
| Wall time (UTC) | 01:30:46 – 09:28:35 | 17:39:32 – 21:11:01 |
| Besu nodes | running since 2026-10-31 20:40 | restarted before the rerun (empty txpool) |

Common to both: Hyperledger Besu 26.8.0 (`openjdk-java-25`), research network 252701 (4 QBFT validators,
2 s blocks, Prague at genesis), layered txpool (confirmed from the start-up log), seed 7, horizon 1,200
steps after t0 (1,261 steps with warm-up), per-step trace on, one run at a time, Node v22.23.4.
Baseline: Hardhat in-process, `../2026-10-30/all_results.json`, same seed and horizon.

Files: `besu-core15-s7.json.gz` and `besu-core15-reruns-s7.json.gz` (campaign, run metadata, full
results with traces); `hardhat-R0-A3-trace.json.gz` (Hardhat rerun of R0-A3 with trace, for the
comparison below); `failed-runs.log` (stderr of the five failed first attempts).

## Results (15 of 15 runs)

| Run | Attempt | Hardhat loss | Besu loss | Same outcome? | Detect / contain (step) | Besu detect / contain after t0 (s) | Benign landed / sent (Besu) |
|---|---|---|---|---|---|---|---|
| R0-A1 | rerun | $3,243.8M | $3,239.7M | **no (−$4.0M, −0.12%)** | — / — | — | 273 / 727 |
| R0-A2 | rerun | $3,243.8M | $3,239.8M | **no (−$4.0M, −0.12%)** | — / — | — | 258 / 727 |
| R0-A3 | 1st | $2,421.2M | $2,218.6M | **no (−$202.6M, −8.37%)** | — / — | — | 140 / 727 |
| R1-A1 | 1st | $95.8M | $95.8M | yes | — / — | — | 268 / 268 |
| R1-A2 | 1st | $95.8M | $95.8M | yes | — / — | — | 268 / 268 |
| R1-A3 | rerun | $95.8M | $95.8M | yes | — / — | — | 268 / 268 |
| R2-A1 | 1st | $0.0M | $0.0M | yes | 0 / 0 | 2.04 / 2.04 | 113 / 114 |
| R2-A2 | 1st | $2,209.7M | $2,209.7M | yes (+$664) | 0 / 0 | 2.04 / 2.05 | 64 / 114 |
| R2-A3 | 1st | $2,209.7M | $2,209.7M | yes (+$664) | 0 / 0 | 2.04 / 2.05 | 65 / 114 |
| R3-A1 | rerun | $0.0M | $0.0M | yes | −16 / −16 | −32.04 / −30.00 | 98 / 98 |
| R3-A2 | rerun | $0.0M | $0.0M | yes | −16 / −16 | −31.95 / −30.02 | 98 / 98 |
| R3-A3 | 1st | $24.0M | $24.0M | yes | 0 / 0 | 0.06 / 2.00 | 114 / 114 |
| R4-A1 | 1st | $0.0M | $0.0M | yes | −16 / −16 | −31.95 / −29.91 | 98 / 98 |
| R4-A2 | 1st | $0.0M | $0.0M | yes | −16 / −16 | −31.92 / −30.00 | 98 / 98 |
| R4-A3 | 1st | $0.0M | $0.0M | yes | 0 / 0 | 0.01 / 1.94 | 114 / 114 |

"Same outcome" compares loss by asset, detection and containment step, loss at first containment,
delegated blocks, benign completed/blocked/paused, signer denials and alert counts. The five failed
first attempts are listed under "Failures"; under rule E14 both attempts are reported.

## Findings

**1. All 12 runs with IBS controls (R1–R4) match Hardhat.** Ten match on every metric. R2-A2 and R2-A3
differ by $664: one 0.289 ETH customer withdrawal sent in the attack block executed on Hardhat but never
landed on Besu once the wallet had been emptied, so the attacker took it.

**2. All 3 unprotected baselines (R0) report lower losses on Besu.** R0-A1 and R0-A2 are $4.0M lower
(1,822 ETH less stolen, 162,663 USDT more); R0-A3 is $202.6M lower (200M USDT and 1,151 ETH less). In all
three the hot wallet's nonce stalls on Besu and not on Hardhat:

- A customer withdrawal at step 18 exceeds hot wallet 14's balance (about 1 ETH). Hardhat rejects it at
  submission. Besu admits it, and every later transaction from that wallet — customer withdrawals and
  the attacker's transfers alike — queues behind it (R0-A1 and R0-A2 stall at nonce 107, R0-A3 at 74).
- The replenishment scheduled at step 200 makes the stuck transaction payable, and about 170 queued
  transactions execute in nonce order in the next block. In R0-A3 the attacker's collection address
  gained nothing from it: about 611 ETH went to queued customer withdrawals and about 1,090 ETH stayed
  in the wallet. On Hardhat the attacker took about 1,698 ETH at this point.
- The wallet stalls again until later replenishments (R0-A1/A2: steps 225–401 and 401–1,071; R0-A3:
  201–1,071). In R0-A3 the 370 ETH (step 400) and 200M USDT (step 411) replenishments arrived during the
  stall; the 200M USDT was never taken on Besu, while on Hardhat the attacker took it on arrival.
- Besu enforces a per-sender queue limit; 40 customer withdrawals in each of R0-A1 and R0-A2 were refused
  with "Transaction nonce is too distant from current sender nonce" (recorded by the new
  `rejectReasons` field). This matches the layered pool's default of 200 queued transactions per sender.

mpfuzz calls these overdraft and latent-overdraft transactions (`survey/notes/wang2024mpfuzz.md`).
Neither backend gives "the" true baseline. Our attacker does not notice a stalled nonce; a real
attacker controlling the orchestration would replace the stuck transaction (same nonce, higher fee) and
get closer to the Hardhat figure. Until an attacker that does this (A3r) is added, report the R0
baseline as a range (e.g. R0-A3: $2,218.6M – $2,421.2M). Comparisons of IBS against the baseline should
use the lower (Besu) figure, which makes the reduction claims conservative.

**3. Detection and containment take one block on real 2 s blocks.** Watcher-only containment (R2) fired
2.04–2.05 s after t0 in all three runs. With signer-side controls (R3-A3, R4-A3) the first alert came
0.01–0.06 s after t0, before the attack block, and containment landed in the next block (1.94–2.00 s).
In R3-A1, R3-A2, R4-A1 and R4-A2 the signer refused the attacker's staging (a type-4 authorization) 16
steps before t0, so detection and containment are negative: about 32 s and 30 s before t0.
(Containment is decided in step −16 and lands in block −15, hence the one-block difference.)

**4. Containment alone cannot stop a one-block drain.** R2-A2 and R2-A3 were contained after 2.05 s yet
lost $2,209.7M, because the drain executed in the attack block itself. Only configurations that refuse
the request before signing (R3/R4 against A1/A2) prevent it, on both backends. This is the empirical case
for combining C1/C2 with C4.

**5. The simulator kept pace with the chain.** 18,915 steps across 15 completed runs, zero overruns,
never more than one block per step.

## Failures and node behaviour

- **First attempts (5 of 15 failed).** Four stopped on a null `eth_getBalance` from Besu (steps 550, 210,
  530, 300); one (R3-A2) crashed Node.js at start-up with V8 internal check failures, before any chain
  interaction, and did not recur.
- **Null reads (E13).** The rerun's retry absorbed one null `eth_getBalance` (in R0-A2) across 5 runs,
  about 3.5 h; without the retry that run would have died again. Besu's own txpool logged three
  `SenderBalanceChecker | Failed to get balance … at chain header N` warnings near two of the
  first-campaign failures (04:22:37, 04:22:43, 06:40:05), so the node itself intermittently fails to read
  state at the head. Root cause inside Besu unknown; `research-net/probe-null-reads.mjs` tests for it
  without the simulator. (An earlier guess, an import via the block-propagation path, did not hold up:
  it appeared near only one failure.)
- **Leftover transactions (E15).** After the node restart the pool started empty, grew to 137 after
  R0-A1 and 279 after R0-A2, then stayed at 279: only the unprotected baseline leaves stuck transactions
  behind. Each run now records the pool size at start and end (`timing.txpool`).

## Null-read probe (2026-11-02, idle chain)

`research-net/probe-null-reads.mjs`, 60 min on the idle chain right after the reruns: 1,801 blocks,
3,602 balance reads (at `latest` and at the explicit block number, immediately after each new block),
**0 nulls, 0 errors**. This does not rule out the fault: the campaigns saw 5 nulls in about 11.5 h,
and the simulator makes many more state reads per block than this probe did, so at the campaigns' rate
one idle hour of 3,602 reads would be expected to show none. Next: a probe with 20× the reads per block
(`REPEAT=20`) for several hours; if it still shows none, the fault most likely needs transaction load or
a busy txpool.

## Next

1. Run the probe for an hour on the idle chain; if it shows no nulls, repeat it alongside a Besu campaign.
2. Hardhat multi-seed campaign (seeds 7–11, horizon 1,200, trace on).
3. Add attacker A3r (replaces a stalled nonce) so the baseline no longer depends on the attacker missing
   the stall.
