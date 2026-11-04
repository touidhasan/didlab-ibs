# Hardhat core-15, seeds 7–11 (2026-11-04)

**Question.** Does the random seed change any outcome of the 15 core runs?

**Answer.** No.
- **Losses barely move.** Across seeds 7–11, every run's loss stays within 0.06% of its median, except two runs that differ by exactly one capped transfer: R1 (1.03%) and R3-A3 (4.16%).
- **Zero stays zero.** Runs with zero loss have zero loss at every seed.
- **Alarms don't move.** The first alarm and the detection and containment steps are the same at every seed.
- **The T3 bounds hold at every seed.** R1 loses at most $96.84M against its $100M bound. R3-A3 loses at most $23.98M against its $25M bound.
- **Configuration matters far more than seed.** Every gap between two configurations facing the same attacker is at least 24 times larger than either configuration's spread across seeds. The smallest gap is R3-A3 vs R4-A3: $23.98M against a spread of $1.00M. Pairs that tie (for example R3-A1 and R4-A1, both $0) tie at every seed.

This closes limitation E5 for Hardhat. Besu still has seed 7 only.

## Setup

| Item | Campaign | Rerun of the failed attempt |
|---|---|---|
| Campaign | `c20261104005121-77dab1` ("Hardhat core 15, seeds 7-11") | `c20261104023229-f69f0e` ("Hardhat core new R3-A3") |
| Runs | 75: 15 core runs × 5 seeds (74 completed, 1 failed) | R3-A3 at seeds 7–11 (5 of 5 completed) |
| Wall time (UTC) | 00:51:21 – 01:12:24 | 02:32:29 – 02:32:59 |

Settings shared by both campaigns:
- Commit `c9811ad`, clean tree.
- Simulator sha256 `45f4e42a…d645a975`.
- Hardhat in-process (HardhatNetwork 2.29.1, EDR 0.3.8, chain 31337).
- Node v22.23.4, on host `didlab-research` (Linux 6.8.0-147).
- Horizon of 1,200 steps, per-step trace on, one run at a time.

Files:
- `hardhat-s7-11.json.gz` and `hardhat-rerun-R3-A3.json.gz`. Each holds the campaign, the run metadata with provenance, and the full results with traces. The failed attempt is included, with `result: null`.

To rebuild the table below:

```
cd testbed
node tools/seed-summary.mjs results/2026-11-04-hardhat-5seeds/hardhat-s7-11.json.gz results/2026-11-04-hardhat-5seeds/hardhat-rerun-R3-A3.json.gz
```

## Results (75 of 75 cells)

R3-A3 at seed 10 comes from the rerun; every other cell comes from the first campaign.

| Run | Seeds | Median loss | Min – max | 95% CI of median | Spread | Benign landed (min – max) | First alert | Detect / contain step |
|---|---|---|---|---|---|---|---|---|
| R0-A1 | 7–11 | $3,243.77M | $3,243.01M – $3,244.17M | $3,243.01M – $3,244.17M | 0.04% of median | 115 – 138 | — | — / — |
| R0-A2 | 7–11 | $3,244.03M | $3,243.12M – $3,244.45M | $3,243.12M – $3,244.45M | 0.04% of median | 99 – 121 | — | — / — |
| R0-A3 | 7–11 | $2,421.24M | $2,420.23M – $2,421.49M | $2,420.23M – $2,421.49M | 0.05% of median | 87 – 110 | — | — / — |
| R1-A1 | 7–11 | $96.84M | $95.85M – $96.84M | $95.85M – $96.84M | 1.03% of median | 268 – 291 | signer:auth7702-requested | — / — |
| R1-A2 | 7–11 | $96.84M | $95.85M – $96.84M | $95.85M – $96.84M | 1.03% of median | 268 – 291 | signer:auth7702-requested | — / — |
| R1-A3 | 7–11 | $96.84M | $95.85M – $96.84M | $95.85M – $96.84M | 1.03% of median | 268 – 291 | signer:velocity | — / — |
| R2-A1 | 7–11 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 114 – 123 | watch:code-at-treasury-eoa | 0 / 0 |
| R2-A2 | 7–11 | $2,209.68M | $2,208.67M – $2,209.93M | $2,208.67M – $2,209.93M | 0.06% of median | 67 – 76 | watch:unexplained-native-tx | 0 / 0 |
| R2-A3 | 7–11 | $2,209.68M | $2,208.67M – $2,209.93M | $2,208.67M – $2,209.93M | 0.06% of median | 66 – 77 | watch:unexplained-native-tx | 0 / 0 |
| R3-A1 | 7–11 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 98 – 104 | signer:auth7702-requested | -16 / -16 |
| R3-A2 | 7–11 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 98 – 104 | signer:auth7702-requested | -16 / -16 |
| R3-A3 | 7–11 | $23.98M | $22.98M – $23.98M | $22.98M – $23.98M | 4.16% of median | 113 – 123 | signer:velocity | 0 / 0 |
| R4-A1 | 7–11 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 98 – 104 | signer:auth7702-requested | -16 / -16 |
| R4-A2 | 7–11 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 98 – 104 | signer:auth7702-requested | -16 / -16 |
| R4-A3 | 7–11 | $0.00M | $0.00M – $0.00M | $0.00M – $0.00M | 0 | 113 – 123 | signer:no-intent | 0 / 0 |

## What the seed changes

- **The legitimate withdrawal requests.** The number of requests depends only on the seed, not on the configuration: 1,339, 1,312, 1,303, 1,344 and 1,314 for seeds 7 to 11.
- **R1's loss, by one capped transfer.** R1 loses either $95.85M (seeds 7 and 10) or $96.84M (seeds 8, 9 and 11). The gap is 434 ETH, or $0.998M, which is one transfer at the per-transaction cap (b = $1M at $2,300/ETH).
  - Not yet checked against the traces: the likely cause is that the seed's legitimate withdrawals use different amounts of the same budget window.
- **R3-A3's loss at seed 10, also by one capped transfer.** Seed 10 loses $22.98M instead of $23.98M (434 ETH less). Seed 10 is also the only R3-A3 seed with an escalated legitimate withdrawal.

## Reproducibility

- **Repeat runs are identical.** R3-A3 at seeds 7, 8, 9 and 11 ran in both campaigns. The full results match exactly apart from wall-clock fields: losses, alarms, signer denials and the per-step trace. The tool above checks this on every run.
- **Seed 7 matches earlier results.** It reproduces the Hardhat column of `../2026-11-01-besu-core15/`: R0-A1 $3,243.8M, R1 $95.8M, R2-A2 $2,209.7M, R3-A3 $24.0M.

## What this means for the statistics plan

With 5 seeds per cell, the planned tests have two problems:
1. **The bootstrap interval adds nothing.** The 95% bootstrap CI of the median equals the observed min–max for every run (table above), so it gives no information beyond the range.
2. **The planned test can never succeed.** A paired Wilcoxon signed-rank test on 5 pairs cannot give a two-sided p below 2/2⁵ = 0.0625, so it can never reject at 0.05, however large the effect.

Plan change, recorded in `docs/RESEARCH_FRAMING.md` §7:
- Hardhat moves to **10 seeds per cell**. The smallest two-sided p then becomes 2/2¹⁰ ≈ 0.002.
- Besu keeps 5 seeds. It validates outcomes; it isn't used to test differences between configurations.
- The cost is small: this 75-run campaign took 21 minutes.

## Failed attempt (limitation E14)

- **What happened.** R3-A3 at seed 10 in the first campaign was killed by `SIGSEGV`. It died 0.8 s after starting and before writing any output: `log.txt` is empty and there is no exit code. The rerun at the same seed completed normally.
- **This is the project's second start-up crash of Node.js v22.23.4.** The first, on 2026-11-01, was R3-A2 on Besu. It was a V8 fatal error ("Check failed: name.IsUniqueName()").
- **The crashes come from below the simulator.** That first run used the rpc backend, which loads neither Hardhat nor any native module. So the fault lies in Node.js/V8 or the host, not in the simulator's JavaScript.
- **Rate so far:** 2 native crashes in 100 run starts since 2026-11-01.
- **New diagnostics.** The dashboard now starts each run with `--report-on-fatalerror` and writes any report into the run's folder.
- **If the crashes recur:**
  - read the kernel log line for the segfault;
  - test the newest Node 22 patch release;
  - check the host's memory.
