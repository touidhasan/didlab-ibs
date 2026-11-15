# Parameter sweeps at 10 seeds (2026-11-15)

**Question.** Do the bounds and the hoarding fix hold when the parameters change? The four parameters are the
budget B, window T, nonce window ν and per-transfer cap b. And what do the settings cost customers?

**Answer.**
- **Every bound holds at every setting and every seed.**
- **Without the fix, the hoarder now exceeds B in the simulator**: in 24 of 30 runs at T = 150, ν = 8 or
  b = USD 2M. Until now only TLC's trace showed it.
- **With the fix, the hoarder stays within B in all 90 runs.**
- **Customers pay nothing measurable.** No setting raised a false alarm, and no setting blocked a customer.

## Setup

- Commit `4687273` (clean), `sim.mjs` sha256 `f7d81eab…`; `simChanged` is false for every run.
- Hardhat in-process, Node v22.23.4, host `didlab-research`, turbo off. Horizon 1,200, per-step trace off.
- 560 of 560 runs completed on the first attempt, in 1.9 hours (2026-11-15 16:27 to 18:37 UTC).
- Seed 7 is identical to the development runs of 2026-11-15 in loss, alerts and customer outcomes.

| File | Campaign | Seeds | Runs |
|---|---|---|---|
| `hardhat-s7-11.csv` | `c20261115162747-d6f191` | 7–11 | 280 |
| `hardhat-s12-16.csv` | `c20261115162821-d7b7f5` | 12–16 | 280 |

- **Design.** One parameter at a time, around the defaults B = USD 25M, T = 300 steps, ν = 4 and b = USD 1M:
  - B = 10M or 50M
  - T = 150 or 600
  - ν = 2 or 8
  - b = 0.5M or 2M
- **Runs.** Each setting is applied to 7 runs: R1-A3, R1-A8, R3-A3, R3-A10, R3h-A10, R4-A4 and R4-benign.
  Configuration names are `<base>_<tag>`, for example `R3h_n8-A10`. The default row comes from
  `../2026-11-14-hardhat-full-10seeds/`.

## Results: loss, median (range over seeds 7–16), USD millions

The two bounds are written next to each setting's name: multi-window bound B⌈H/T⌉ / single-incident bound B + Wνb,
with W = 3 and H = 1,200.

| Setting | R1-A3 | R1-A8 | R3-A3 | R3-A10 (no fix) | R3h-A10 (fix) | R4-A4 |
|---|---|---|---|---|---|---|
| defaults (100 / 37) | 96.34 (94.85–96.84) | 76.87 (75.93–79.98) | 23.98 (22.98–23.98) | 22.98 (20.99–23.98) | 18.99 (17.00–19.99) | 23.98 (22.98–23.98) |
| B = 10M (40 / 22) | 36.45 (34.96–36.95) | 21.17 (20.07–23.08) | 9.00 (8.00–9.00) | 6.01 (4.00–9.01) | 4.00 (4.00–5.02) | 9.00 (8.00–9.00) |
| B = 50M (200 / 62) | 196.23 (194.72–197.73) | 172.54 (171.43–175.70) | 48.95 (47.95–48.95) | 47.95 (45.95–48.95) | 43.95 (41.95–44.95) | 48.95 (47.95–48.95) |
| T = 150 (200 / 37) | 193.67 (190.67–195.67) | 164.87 (163.79–168.04) | 23.98 (22.98–23.98) | **25.98 (24.98–26.98)** | 21.99 (20.99–22.98) | 23.98 (22.98–23.98) |
| T = 600 (50 / 37) | 47.93 (46.93–47.93) | 34.59 (33.57–36.21) | 23.98 (22.98–23.98) | 17.00 (16.00–19.99) | 13.00 (12.00–16.00) | 23.98 (22.98–23.98) |
| ν = 2 (100 / 31) | 96.34 (94.85–96.84) | 76.87 (75.93–79.98) | 23.98 (22.98–23.98) | 20.98 (18.99–21.98) | 18.99 (16.99–19.99) | 23.98 (22.98–23.98) |
| ν = 8 (100 / 49) | 96.34 (94.85–96.84) | 76.87 (75.93–79.98) | 23.98 (22.98–23.98) | **26.98 (24.99–27.98)** | 19.00 (17.00–20.00) | 23.98 (22.98–23.98) |
| b = 0.5M (100 / 31) | 97.37 (96.87–97.87) | 82.78 (81.57–84.13) | 23.98 (23.48–23.98) | 21.98 (20.49–22.48) | 19.99 (18.49–20.49) | 23.98 (23.48–23.98) |
| b = 2M (100 / 49) | 94.96 (91.96–95.96) | 69.22 (67.00–70.72) | 24.00 (22.00–24.00) | **26.01 (24.01–28.01)** | 18.01 (16.01–20.01) | 24.00 (22.00–24.00) |

## What the sweep shows

- **Every bound holds, in all 560 runs.**
  - Multi-window: the largest loss is 197.73 against 200 (B = 50M) and 195.67 against 200 (T = 150), so the
    bound stays tight as it scales.
  - Single incident (R3-A3, R3-A10, R4-A4): the largest is 28.01 against 49 (b = 2M).
- **The old claim, Loss ≤ B, fails in the simulator whenever the held amount νb is large next to the slack the
  customers leave in the window.**
  - R3-A10 exceeds B = 25 in 7 of 10 seeds at T = 150, in 9 of 10 at ν = 8 and in 8 of 10 at b = 2M. The largest
    is 28.01.
  - At the defaults it never does: 23.98 at most.
- **The fix removes exactly the held amount.**
  - R3h-A10 stays within B at every setting and seed: 90 of 90 runs.
  - It is lower than R3-A10 at every seed, by about νb: USD 2M at ν = 2 or b = 0.5M, USD 4M at the defaults, and
    USD 8M at ν = 8 or b = 2M. Exact Wilcoxon p = 0.002 at every setting except B = 10M.
- **At B = 10M the hoard is caught early.** In 5 of 10 seeds (7, 10, 12, 13 and 15), the held USD 4M plus customer
  withdrawals use up the budget before the attacker sends anything.
  - A customer request is refused, the budget alarm freezes the signer at step 189–276, and every later
    request from the attacker is refused.
  - **The held USD 4M is still lost.** It was signed before the freeze, and a freeze cannot recall a signature.
  - In those seeds the fix changes nothing, so p = 0.0625 at this setting.
- **The nonce window ν changes nothing except hoarding.** R1-A3, R1-A8, R3-A3 and R4-A4 are identical at ν = 2,
  4 and 8.
- **Customers.** R4-benign raised no alarm and blocked no customer at any setting, B = 10M included. 711–727
  withdrawals completed. Escalations to people rise only at b = USD 0.5M: 2–7 per run, against 0–2 otherwise.
