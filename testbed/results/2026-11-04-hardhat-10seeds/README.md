# Hardhat core-15, seeds 7–16 (2026-11-04)

**Question.** Do the 15 core outcomes hold across 10 seeds, and are the differences between configurations
statistically clear?

**Answer.** Yes on both counts.
- **Seeds 12–16 confirm seeds 7–11.** Every loss stays within 0.10% of its median, except R1 (2.07%) and R3-A3 (4.16%). Those two take discrete values one capped transfer apart.
- **Zero stays zero, and alarms don't move.** Runs with zero loss have zero loss at all 10 seeds. The first alarm and the detection and containment steps are the same at every seed.
- **The T3 bounds hold at every seed.** R1 loses at most $96.84M against its $100M bound. R3-A3 loses at most $23.98M against its $25M bound.
- **Every configuration difference is significant, or the two configurations are identical.**
  - Wherever two configurations differ, the stronger one has the lower loss at all 10 seeds. The exact two-sided Wilcoxon p is then 2/2¹⁰ ≈ 0.002, the smallest possible with 10 pairs.
  - The remaining pairs (R2/R3/R4 against A1, R3/R4 against A2) are identical at every seed.

## Setup

| Item | Seeds 12–16 | Rerun of failed attempts |
|---|---|---|
| Campaign | `c20261104024659-98d807` ("hardhat core 15 seed 12-16") | `c20261104055858-cf16a9` ("hardhat core R0-A2 R3-A3 seed 12-16") |
| Runs | 75 (73 completed, 2 failed: R0-A2 s16, R3-A3 s13) | R0-A2 and R3-A3 at seeds 12–16 (9 completed, 1 failed: R3-A3 s16) |
| Wall time (UTC) | 02:46:59 – 03:06:35 | 05:58:58 – 06:04:20 |

Settings shared by both campaigns:
- Commit `5899cff`, clean tree.
- Simulator sha256 `45f4e42a…d645a975`, the same simulator as seeds 7–11.
- Hardhat in-process, Node v22.23.4, host `didlab-research`.
- Horizon of 1,200 steps, trace on, one run at a time.

Seeds 7–11 are in `../2026-11-04-hardhat-5seeds/`.

Every cell is complete: R0-A2 s16 and R3-A3 s13 come from the rerun. R3-A3 s16 completed in the first campaign, so its failed rerun attempt is only on record.

To rebuild both tables below:

```
cd testbed
node tools/seed-summary.mjs results/2026-11-04-hardhat-5seeds/hardhat-s7-11.json.gz \
  results/2026-11-04-hardhat-5seeds/hardhat-rerun-R3-A3.json.gz \
  results/2026-11-04-hardhat-10seeds/hardhat-s12-16.json.gz \
  results/2026-11-04-hardhat-10seeds/hardhat-rerun-R0-A2-R3-A3.json.gz
```

## Results (150 of 150 cells)

| Run | Seeds | Median loss | Min – max | 95% CI of median | Spread | Benign landed (min – max) | First alert | Detect / contain step |
|---|---|---|---|---|---|---|---|---|
| R0-A1 | 7–16 | $3,243.51M | $3,241.50M – $3,244.17M | $3,243.17M – $3,243.77M | 0.08% of median | 115 – 138 | — | — / — |
| R0-A2 | 7–16 | $3,243.80M | $3,242.03M – $3,244.45M | $3,243.45M – $3,244.09M | 0.07% of median | 99 – 121 | — | — / — |
| R0-A3 | 7–16 | $2,421.12M | $2,419.23M – $2,421.49M | $2,420.62M – $2,421.30M | 0.09% of median | 87 – 110 | — | — / — |
| R1-A1 | 7–16 | $96.34M | $94.85M – $96.84M | $94.85M – $96.84M | 2.07% of median | 268 – 397 | signer:auth7702-requested | — / — |
| R1-A2 | 7–16 | $96.34M | $94.85M – $96.84M | $94.85M – $96.84M | 2.07% of median | 268 – 397 | signer:auth7702-requested | — / — |
| R1-A3 | 7–16 | $96.34M | $94.85M – $96.84M | $94.85M – $96.84M | 2.07% of median | 268 – 397 | signer:velocity | — / — |
| R2-A1 | 7–16 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 114 – 123 | watch:code-at-treasury-eoa | 0 / 0 |
| R2-A2 | 7–16 | $2,209.56M | $2,207.68M – $2,209.93M | $2,209.06M – $2,209.74M | 0.10% of median | 67 – 76 | watch:unexplained-native-tx | 0 / 0 |
| R2-A3 | 7–16 | $2,209.56M | $2,207.67M – $2,209.93M | $2,209.06M – $2,209.74M | 0.10% of median | 66 – 77 | watch:unexplained-native-tx | 0 / 0 |
| R3-A1 | 7–16 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 97 – 104 | signer:auth7702-requested | -16 / -16 |
| R3-A2 | 7–16 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 97 – 104 | signer:auth7702-requested | -16 / -16 |
| R3-A3 | 7–16 | $23.98M | $22.98M – $23.98M | $22.98M – $23.98M | 4.16% of median | 113 – 123 | signer:velocity | 0 / 0 |
| R4-A1 | 7–16 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 97 – 104 | signer:auth7702-requested | -16 / -16 |
| R4-A2 | 7–16 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 97 – 104 | signer:auth7702-requested | -16 / -16 |
| R4-A3 | 7–16 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 113 – 123 | signer:no-intent | 0 / 0 |

## Contrasts between configurations

Each row pairs the two configurations seed by seed against the same attacker. The test is exact and two-sided; seeds where the two losses are equal are dropped, as Wilcoxon's method requires.

| Contrast (loss) | Seeds paired | Median reduction | Seeds with lower loss | Exact Wilcoxon p (two-sided) |
|---|---|---|---|---|
| R0-A1 → R1-A1 | 10 | $3,147.25M | 10 of 10 | 0.0020 |
| R0-A1 → R2-A1 | 10 | $3,243.51M | 10 of 10 | 0.0020 |
| R0-A1 → R3-A1 | 10 | $3,243.51M | 10 of 10 | 0.0020 |
| R0-A1 → R4-A1 | 10 | $3,243.51M | 10 of 10 | 0.0020 |
| R1-A1 → R4-A1 | 10 | $96.34M | 10 of 10 | 0.0020 |
| R2-A1 → R4-A1 | 10 | $0.00M | 0 of 10 | identical at every seed |
| R3-A1 → R4-A1 | 10 | $0.00M | 0 of 10 | identical at every seed |
| R0-A2 → R1-A2 | 10 | $3,147.45M | 10 of 10 | 0.0020 |
| R0-A2 → R2-A2 | 10 | $1,034.35M | 10 of 10 | 0.0020 |
| R0-A2 → R3-A2 | 10 | $3,243.80M | 10 of 10 | 0.0020 |
| R0-A2 → R4-A2 | 10 | $3,243.80M | 10 of 10 | 0.0020 |
| R1-A2 → R4-A2 | 10 | $96.34M | 10 of 10 | 0.0020 |
| R2-A2 → R4-A2 | 10 | $2,209.56M | 10 of 10 | 0.0020 |
| R3-A2 → R4-A2 | 10 | $0.00M | 0 of 10 | identical at every seed |
| R0-A3 → R1-A3 | 10 | $2,324.58M | 10 of 10 | 0.0020 |
| R0-A3 → R2-A3 | 10 | $211.56M | 10 of 10 | 0.0020 |
| R0-A3 → R3-A3 | 10 | $2,397.33M | 10 of 10 | 0.0020 |
| R0-A3 → R4-A3 | 10 | $2,421.12M | 10 of 10 | 0.0020 |
| R1-A3 → R4-A3 | 10 | $96.34M | 10 of 10 | 0.0020 |
| R2-A3 → R4-A3 | 10 | $2,209.56M | 10 of 10 | 0.0020 |
| R3-A3 → R4-A3 | 10 | $23.98M | 10 of 10 | 0.0020 |

## Reproducibility

- **Repeat runs are identical.** Eleven (spec, seed) cells completed in more than one campaign, and all 11 are identical apart from wall-clock fields: R3-A3 at seeds 7, 8, 9 and 11, and R0-A2 and R3-A3 at seeds 12–15.
- **The commit changed but the simulator didn't.** The two batches ran at different commits (`c9811ad` and `5899cff`) with the same simulator hash.

## The shared budget in R1 (no intents)

In R1, both the attacker and real customers are refused by the same velocity budget:
- the attacker 5,745 times at every seed;
- customer withdrawals 314–458 times, depending on the seed.

So 268–397 customer withdrawals land in R1, against 97–123 in R4, where containment pauses withdrawals instead.

R1's loss takes three values one capped transfer apart ($94.85M, $95.85M, $96.84M). How the seed decides which value it gets is not established. Seeds 12–14 combine the lowest loss with the most customer withdrawals landed, but seeds 7 and 10 have a middle loss without that. The traces hold the answer and are left for the T7 analysis.

## Failed attempts (limitation E14)

Across both batches, 4 of 165 Hardhat run starts crashed. All 4 crashed within 0.8 s, before any output, on different cells:

| Attempt | Signal | Output |
|---|---|---|
| `c20261104005121-77dab1-R3-A3-s10` | SIGSEGV after 0.8 s | none |
| `c20261104024659-98d807-R0-A2-s16` | SIGSEGV after 0.7 s | none |
| `c20261104024659-98d807-R3-A3-s13` | SIGSEGV after 0.5 s | none |
| `c20261104055858-cf16a9-R3-A3-s16` | SIGABRT after 0.5 s | `free(): invalid pointer` (glibc found a corrupted heap) |

- **The signatures point at native memory corruption during start-up**, not at simulator logic. That includes the earlier rpc-backend crash, a V8 fatal check.
- **The kernel log has no entry for the crashes.**
- **Where the corruption happens is not yet known.** One candidate loads on both backends: `sim.mjs` imports solc-js, a large WebAssembly module, at start-up. `tools/start-probe.mjs` separates Node, viem, solc-js, Hardhat and the full simulator start.
- **Retries are now automatic.** Since this change, the dashboard retries a start-up crash up to twice and keeps every attempt on record (`dashboard/test-retry.mjs`).
