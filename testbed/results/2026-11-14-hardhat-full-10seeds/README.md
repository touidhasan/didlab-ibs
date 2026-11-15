# Hardhat full matrix at 10 seeds (2026-11-13/14)

**Question.** Over 10 seeds, do the results hold for all 65 runs in the plan? This is CP4's Hardhat matrix.

**Answer.** Yes. Every bound holds in all 650 runs, and the seed changes no outcome. Every earlier recorded Hardhat
result reproduces exactly: 215 runs, from 2026-10-30 onward.

## Setup

- Commit `cfc68f1` (clean), `sim.mjs` sha256 `3f334c16…`; `simChanged` is false for every run.
- Hardhat in-process (HardhatNetwork 2.29.1), Node v22.23.4, host `didlab-research`, turbo off.
- Horizon 1,200, per-step trace off. Run time 2.7 hours (2026-11-13 21:23 to 11-14 00:27 UTC).
- Two campaigns, because the dashboard caps a campaign at 500 runs:

| File | Campaign | Seeds | Runs |
|---|---|---|---|
| `hardhat-s7-11.csv` | `c20261113212306-4da595` | 7–11 | 325 |
| `hardhat-s12-16.csv` | `c20261113212334-14a127` | 12–16 | 325 |

- **650 of 650 runs completed on the first attempt**, with no crash and no retry. E14 attributed the earlier
  start-up crashes to the host CPU under turbo: 14 of 300 with turbo on, against 0 of 300 with it off. This adds
  0 of 650 with it off.

## Reproducibility

Each comparison below checks loss, alerts during the attack, customer withdrawals completed and blocked, and the
detection and containment steps.

| Earlier record | Runs | Identical |
|---|---|---|
| Core 15 at seeds 7–16 (`../2026-11-04-hardhat-5seeds/`, `../2026-11-04-hardhat-10seeds/`, with their reruns) | 150 | 150 |
| Seed 7: A3r and A9, A10, A5 and A8, the hoarding fix (`../2026-11-06-…`, `../2026-11-09-…`, `../2026-11-10-…`) | 32 | 32 |
| `../2026-10-30/all_results.json` (R4t, R2p/R3p/R4p and benign runs among them; loss and alerts) | 33 | 33 |

## Results: loss over 10 seeds, USD millions

Medians are shown with the range over seeds 7–16.

**Bounds.** B = 25, T = 300 steps, b = 1, ν = 4, W = 3, H = 1,200.
- **Multi-window bound B⌈H/T⌉ = 100.** The largest loss in any configuration with budgets is 98.84 (R3p-A1,
  R3p-A3, R4p-A4, early unfreeze). Without early unfreeze the largest is 97.00 (R1-A5).
- **Single-incident bound B + Wνb = 37** (contained, intent authority intact). The largest such loss is 23.98:
  R3-A3, R3-A10, R3-A3r and R3-A9.
- **With the hoarding fix (R3h), the single-incident bound is B = 25.** The largest R3h loss is 23.98 (R3h-A3).
  The hoarder R3h-A10 takes at most 19.99.

| Group | Runs | Median (range) | Notes |
|---|---|---|---|
| No controls | R0-A1, A2 | 3,243.5–3,243.8 (3,241.5–3,244.5) | |
| | R0-A3, A3r, A9 | 2,421.1 (2,419.2–2,421.5) | |
| | R0-A5 | 1,460.0 | every seed |
| | R0-A8 | 88.09 | every seed |
| Budgets only | R1-A1, A2, A3, A3r, A9 | 96.34 (94.85–96.84) | |
| | R1-A5 | 96.50 (95.00–97.00) | |
| | R1-A10 | 73.39 (71.90–74.89) | |
| | R1-A8, R4-A8i | 76.87 (75.93–79.98) | 0 alerts |
| Watcher only | R2-A2, A3, A3r, A9 | 2,209.6 (2,207.7–2,209.9) | T5 |
| | R2-A5 | 1,460.0 | T5 |
| | R2-A1 | 0 | |
| | R2-A8, R3-A8 | 0.08 | contained after the first drip |
| Early unfreeze | R2p-A1 / R2p-A3 | 2,286.1 / 2,221.1 | |
| | R3p-A1, A3; R4p-A4 | 98.3–98.8 | |
| | R4p-A1, A3 | 0 | |
| Contained | R3-A3, A3r, A9; R4-A4; R4t-A4; R3h-A3; R4h-A4 | 23.98 (22.98–23.98) | |
| | R3-A5, R4-A5i | 24.00 (23.00–24.00) | |
| | R3-A10, R4-A10i | 22.98 (20.99–23.98) | |
| | R3h-A10, R4h-A10i | 18.99 (17.00–19.99) | |
| Nothing taken | R3/R4 with A1, A2; R4-A3, A3r, A9, A5, A8, A10; R4t-A1, A2, A3 | 0 | |

## Paired contrasts

The test is an exact Wilcoxon signed-rank test over 10 seeds; p = 0.002 is its minimum.
- **The hoarding fix lowers A10's take by USD 3.99M at every seed** (R3h-A10 against R3-A10, and R4h-A10i against
  R4-A10i; p = 0.002). That is the held USD 4.0M, now counted in the new window.
- **The fix changes nothing else.** R3h-A3 against R3-A3, R4h-A4 against R4-A4, and both benign pairs are identical
  at all 10 seeds in loss, customer withdrawals and alerts.
- **A8 is quieter and cheaper than A3 under budgets alone, at every seed** (R1-A8 against R1-A3; p = 0.002 for each
  difference below).
  - It takes USD 16.9M–20.9M less.
  - It raises about 6,100 fewer alerts: 0 against 6,059–6,203.
  - 314–458 more customer withdrawals complete, because A8 leaves the budget for customers.
- **R4-A8i equals R1-A8 at every seed.** With the intent authority compromised and no budget alarm, full IBS gives
  the drip nothing to trip on.
- **Small, systematic differences with no practical weight.** R1-A5 is USD 0.15M above R1-A3, and R3-A5 USD 0.02M
  above R3-A3, at every seed. A5 sends exact USD 1M USDT transfers; A3's cap-sized ETH transfers come to slightly
  under USD 1M each.

## Customers and false alarms

- **No benign run raised an alert** (0 false alerts in all 650 runs). In R1, R3 and R4 the benign runs complete a
  median of 721 customer withdrawals. R0 completes 722.5; the gap of about 1.5 is withdrawals above the USD 1M cap,
  which are escalated to people.
- **Containment blocks the customers who come after the freeze.** In R2–R4 attack runs that is 602 blocked
  (median). With the freeze at step 301 (A10), it is 283.5.
- **Budgets alone (R1) block 426.5 customer withdrawals** (median) under A1–A3: the attacker uses up the budget.
