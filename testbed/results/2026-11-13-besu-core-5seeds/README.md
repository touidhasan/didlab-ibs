# Besu core matrix at 5 seeds (2026-11-11 to 11-13)

**Question.** Does Besu agree with Hardhat on the core 15 runs at every seed, not just seed 7? This is CP4's
Besu matrix.

**Answer.** It agrees to the dollar in every configuration that has a signing policy.
- **R1, R3 and R4 (45 runs), and R2-A1 (5 runs):** 50 of 75 runs equal Hardhat to the dollar. Customer outcomes,
  alert counts and detection and containment steps are equal too.
- **The other 25 runs are R0 and R2-A2/A3**, which have no signing policy. There the naive attackers lose part of
  the drain on Besu. The cause is shown below: it is the attacker, not IBS.

## Setup

- Campaign `c20261111000516-7a9e03`, commit `7162d13` (clean), `sim.mjs` sha256 `3f334c16…`. `simChanged` is false
  for every run.
- Besu 26.8.0, chain 252701, 2-second blocks. Node v22.23.4, host `didlab-research`, turbo off.
- Runs: core 15 × seeds 7–11 = 75, horizon 1,200, one at a time.
  - 2026-11-11 00:05 to 11-13 04:58 UTC; 52.6 hours of run time, 2,526–2,527 s per run.
  - 75 of 75 completed on the first attempt: no crash and no retry. 0 step overruns in 1,261 steps per run.
- Hardhat reference: `../2026-11-04-hardhat-5seeds/hardhat-s7-11.json.gz` (commit `c9811ad`), plus its R3-A3
  rerun. The core cells are unchanged since (`replay-check --current`, 15 of 15 identical at seed 7 on
  2026-11-10).

File: `besu-s7-11.csv` (dashboard export).

## Results: Besu loss minus Hardhat loss, USD millions

| Run | s7 | s8 | s9 | s10 | s11 |
|---|---|---|---|---|---|
| R0-A1 | −4.03 | −4.77 | −5.51 | −3.25 | **−175.58** |
| R0-A2 | −4.03 | −4.95 | −5.61 | **−111.32** | −3.87 |
| R0-A3 | −202.65 | −201.94 | −201.80 | −211.55 | −202.56 |
| R1-A1, A2, A3 | 0 | 0 | 0 | 0 | 0 |
| R2-A1 | 0 | 0 | 0 | 0 | 0 |
| R2-A2 | 0.00 | +0.03 | 0.00 | **−107.98** | 0.00 |
| R2-A3 | 0.00 | **−1,614.64** | **−1,614.66** | **−2,106.25** | **−1,614.71** |
| R3-A1, A2, A3 | 0 | 0 | 0 | 0 | 0 |
| R4-A1, A2, A3 | 0 | 0 | 0 | 0 | 0 |

The R1, R3 and R4 losses on both backends:

| Run | Loss at every seed |
|---|---|
| R1 (all attackers) | USD 95.85M (s7, s10) or USD 96.84M (s8, s9, s11) |
| R3-A3 | USD 23.98M; USD 22.98M at s10 |
| R3-A1, R3-A2, R4 | 0 |

## Why the uncontrolled runs lose less on Besu

**The attacker reads a wallet's balance at the latest block while a customer withdrawal from the same wallet is
still pending**, then asks for that whole balance. Hardhat in-process mines each transaction as it is sent, so the
read is exact there. On Besu the customer's transaction is still pending, so it executes first in the same block:
- **A token drain then asks for more than is left and reverts.**
- **An ETH drain (balance minus 2 ETH) becomes underfunded** when the customer took more than 2 ETH. Besu holds it
  (E8), and the wallet's later transactions wait behind it.

The customer withdrawals sent in the same step as the attacker's first drain (t = 0) explain every R2-A3 figure.
They were logged with a diagnostic copy of the simulator on Hardhat; the customer stream depends only on the seed,
so it is the same on Besu.
- **s7:** hot wallet 14 sends 0.29 ETH. That is less than the 2 ETH margin, so the drain is unaffected and
  Besu = Hardhat.
- **s8, s9, s11:** hot 14 sends 25,124, 1,600 and 392 USDT. Its USDT drain reverts, and hot 14's 1,614.7M USDT is
  not taken: −USD 1,614.7M.
- **s10:** hot 14 sends 4.25 ETH, so its ETH drain is underfunded and held, with its USDT drain behind it. Hot 16
  sends 397 USDT, so its USDT drain reverts. Only hot 16's ETH (28,008 ETH) and hot B's 38M USDT are taken:
  USD 102.4M.

In R2 the watcher freezes the signer at the end of that first block, so the attacker never gets a second try. In
R0 nothing stops it, so it mostly recovers later. R0's remaining gaps fit the same pattern but were not traced run
by run:
- R0-A2 s10 and R2-A2 s10 both miss hot 16's 108M USDT.
- R0-A1 s11 misses all of hot 16 (28k ETH and 108M USDT).
- R0-A3 is the known naive-A3 stall (about USD 200M), which the fixed A3r closes at seed 7
  (`../2026-11-06-mempool-attackers/`).

## What this means

- **IBS behaves identically on both clients.** Every run with a signing policy is equal to the dollar at all 5
  seeds, customers and alerts included.
- **T5 holds at every seed on Besu, with a range.** Detection alone cannot stop the first block: R2-A3 loses
  USD 102M–2,210M, and R2-A2 USD 2,101M–2,210M. The low end comes from a naive attacker. One that subtracts
  pending withdrawals before draining would take the full amount, as A3r does for R0-A3. That variant is not built.
- **For reporting:** Besu equals Hardhat for R1–R4 and R2-A1. For the R0 and R2-A2/A3 baselines, report Hardhat
  together with the Besu range above.
