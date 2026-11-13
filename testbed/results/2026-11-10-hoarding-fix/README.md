# Hoarding fix (R3h, R4h), Hardhat, seed 7 (2026-11-10)

**Question.** Does counting unexecuted signatures against the budget keep the hoarder (A10) inside one budget,
and does it cost anything elsewhere?

**Answer.** Yes, and no cost at seed 7. The hoarder's take drops from USD 21.99M to USD 17.99M. The USD 4.0M it
held from an earlier window now counts in the new window's USD 25M. A3, A4 and the benign runs are identical to
R3 and R4.

## Setup

- Campaign `c20261110235931-bd26ec`, commit `7162d13` (clean), `sim.mjs` sha256 `3f334c16…`.
- Hardhat in-process, Node v22.23.4, host `didlab-research`, turbo off. Seed 7, horizon 1,200.
- 6 of 6 runs completed on the first attempt.

File: `hardhat-s7.csv`. The runs match the development runs of 2026-11-10 exactly.

## Results

| Run | Loss | Without the fix (R3/R4) | Customer withdrawals completed / blocked |
|---|---|---|---|
| R3h-A10 | USD 17.99M (4.00 held + 13.99 fresh) | USD 21.99M | 440 / 286 |
| R4h-A10i | USD 17.99M | USD 21.99M | 440 / 286 |
| R3h-A3 | USD 23.98M | USD 23.98M | 114 / 613 |
| R4h-A4 | USD 23.98M | USD 23.98M | 114 / 613 |
| R3h-benign | 0 | 0 | 726 / 0 |
| R4h-benign | 0 | 0 | 726 / 0 |

Not yet run: the fix on Besu, other seeds, and the TLC check of configurations R3h, R4h and Benign-h. The fix's
cost when signed transactions stall (E17) is not measured.
