# Attackers A5 (blind signing at a multisig) and A8 (drip), seed 7, both backends (2026-11-10)

**Question.** What do the CP3 attackers take under each configuration, and does Besu agree with Hardhat?

**Answer.**
- **Hardhat reproduces the development runs exactly.** All 12 cells match in loss and alert count.
- **Besu matches Hardhat to the dollar in 11 of 12 cells.** The exception, R3-A5, was predicted before the run
  (E16, written on 2026-11-09): USD 4.0M on Besu against USD 24.0M on Hardhat.

## Setup

- Commit `e21f7c4` (clean), `sim.mjs` sha256 `7da8e0f8…`; `simChanged` is false for every run.
- Node v22.23.4, host `didlab-research`, turbo off. Seed 7, horizon 1,200, one run at a time.
- **Hardhat:** in-process (HardhatNetwork 2.29.1), campaign `c20261110043930-cc5b3b`. File `hardhat-s7.csv`.
- **Besu:** Besu 26.8.0, chain 252701, 2-second blocks, campaign `c20261110045347-545f7e`. File `besu-s7.csv`.
  - 1,261 steps per run, 0 step overruns.
  - Every run completed on its first attempt.

## Results

Customer withdrawals are given as completed / blocked.

| Run | Hardhat loss | Besu loss | Alerts (HH / Besu) | Detect / contain step (Besu) | Customers (HH / Besu) |
|---|---|---|---|---|---|
| R0-A5 | USD 1,460.0M | USD 1,460.0M | 0 / 0 | – | 727/0, 727/0 |
| R1-A5 | USD 96.0M | USD 96.0M | 1,634 / 1,611 | – | 241/485, 241/485 |
| R2-A5 | USD 1,460.0M | USD 1,460.0M | 1 / 1 | 0 / 0 | 114/613, 114/613 |
| R3-A5 | USD 24.0M | **USD 4.0M** | 25 / 4 | 0 / 0 | 114/613, 114/613 |
| R4-A5 | 0 | 0 | 1 / 1 | 0 / 0 | 114/613, 114/613 |
| R4-A5i | USD 24.0M | USD 24.0M | 1 / 1 | **6 / 6** | 114/613, 120/607 |
| R0-A8 | USD 88.09M | USD 88.09M | 0 / 0 | – | 727/0, 727/0 |
| R1-A8 | USD 76.80M | USD 76.80M | **0 / 0** | – | 726/0, 726/0 |
| R2-A8 | USD 0.08M | USD 0.08M | 1 / 1 | 0 / 0 | 114/613, 114/613 |
| R3-A8 | USD 0.08M | USD 0.08M | 1 / 1 | 0 / 0 | 114/613, 114/613 |
| R4-A8 | 0 | 0 | 1 / 1 | 0 / 0 | 114/613, 114/613 |
| R4-A8i | USD 76.80M | USD 76.80M | **0 / 0** | – | 726/0, 726/0 |

## What the runs show

### A5: blind signing at the multisig

The multisig needs 2 of 3 owners plus S's co-signature.

- **Without a policy at S, the payload is all that counts.** In R0 and R2, S co-signs on request, so one
  DELEGATECALL empties the wallet (USD 1.46B) in one block. R2's watcher sees it in that block: too late (T5).
- **S decodes what is actually signed, so the owners' display stops mattering.** In R1, R3 and R4, S refuses to
  co-sign the DELEGATECALL; denial reason `undecodable`. The attacker falls back to capped transfers:
  - R1 loses USD 96.0M, within B⌈H/T⌉ = USD 100M.
  - R3 loses USD 24.0M on Hardhat and USD 4.0M on Besu.
  - R4 loses nothing: the only intent the attacker has names hot wallet 14, so the first fallback transfer is an
    intent mismatch (hard alarm).
- **With the quorum fooled into approving attacker intents (A5i), R4 does no better than R3.** The loss is
  USD 24.0M, within the single-incident bound.
- **The DELEGATECALL denial raises no alarm.** Under the decision rule, an undecodable request is refused silently.
  A refused DELEGATECALL from a multisig is a strong compromise signal, so making it alarm is a design option
  (not evaluated).

### Why R3-A5 and R4-A5i differ on Besu

S's nonce window for the multisig starts at the executed nonce (E16). Besu therefore mines at most ν = 4
co-signed multisig transactions per block. Hardhat in-process mines each one as it is sent.

- **R3-A5:** the watcher alarms on the first block of outflows, which holds 4 transfers (USD 4.0M). On Hardhat,
  24 transfers land in the same step before the budget trips.
- **R4-A5i:** the transfers match attacker-minted intents, so only the budget can alarm. The attacker needs
  6 blocks to reach it.
  - The loss is the same USD 24.0M, but detection comes at step 6 (12.0 s) instead of step 0, and containment
    1.9 s later (one block, T4).
  - Six more customer withdrawals complete before the freeze.
- **R1-A5 has fewer alerts on Besu** (1,611 against 1,634), most likely for the same reason. The attacker needs
  6 blocks instead of one to use up each window's budget, so about 5 fewer steps per window end in a refused,
  alerting request. Across the 4 windows that would account for about 20 of the 23. Not traced further.

### A8: drip below the budgets

- **A8 never trips a budget.** In R1 it takes USD 76.80M with zero alerts and blocks no customer withdrawal. For
  comparison, A3 in R1 takes USD 95.8M but raises 4,263 alerts and blocks 458 withdrawals. A8's pace is
  self-imposed, so R0 shows its ceiling: USD 88.09M, one drip per block until the manual response.
- **The watcher and intents stop it at once.** R2 and R3 contain it after the first drip (USD 0.08M). R4 refuses
  the first request, which has no intent.
- **With the intent authority compromised (R4-A8i), nothing alarms before the manual response.** The loss,
  USD 76.80M, is bounded only by B⌈H/T⌉ = USD 100M: the single-incident bound B + Wνb assumes an alarm.
- **Besu equals Hardhat to the dollar in every A8 cell**, alerts and customer outcomes included. That is expected
  with one transfer per block.
