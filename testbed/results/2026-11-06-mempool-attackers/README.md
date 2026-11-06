# Mempool-aware attackers A3r and A9, seed 7 (2026-11-06)

**Question.** Do the mempool-aware attackers change any outcome, and does A3r remove the Besu baseline gap
(limitation E8)?

**Answer.**
- **Hardhat.** Both attackers equal A3 exactly, as designed: Hardhat refuses underfunded transactions, so there
  is no stall to exploit.
- **Besu, R1–R4.** Both equal Hardhat. R2 differs by USD 664, the same small difference as R2-A2/A3 earlier.
- **Besu, R0. A3r did not close the gap:** R0-A3r lost USD 2,218.9M on Besu, against USD 2,218.6M for A3 and
  USD 2,421.2M on Hardhat. The A3r that ran had two weaknesses:
  - it gave up after 8 replacements per wallet (a defect);
  - it replaced only the stuck nonce, not the queue behind it.

  Both are fixed (below). R0-A3r is to be rerun on Besu.
- **No step overruns with turbo off.** All 10 Besu runs had 0 step overruns in 1,261 steps, and detection and
  containment took one block (1.97–2.01 s). The risk that turbo off would slow Besu steps did not materialise.

## Runs

| Run | Hardhat loss | Besu loss | Besu minus Hardhat |
|---|---|---|---|
| R0-A3r | USD 2,421.24M | USD 2,218.85M | −USD 202.39M |
| R0-A9 | USD 2,421.24M | USD 2,220.66M | −USD 200.58M |
| R1-A3r, R1-A9 | USD 95.85M | USD 95.85M | 0 |
| R2-A3r, R2-A9 | USD 2,209.68M | USD 2,209.68M | +USD 664 |
| R3-A3r, R3-A9 | USD 23.98M | USD 23.98M | 0 |
| R4-A3r, R4-A9 | 0 | 0 | 0 |

For reference, R0-A3 at seed 7 (`../2026-11-01-besu-core15/`): Hardhat USD 2,421.2M, Besu USD 2,218.6M.

**Hardhat** (`hardhat-s7.csv`):
- Campaign `c20261106032439-538e6f`, commit `493cc39` (clean), 10 of 10 runs completed.
- Every run equals A3 at seed 7 in loss and in customer withdrawals.

**Besu** (`besu-s7.csv`):
- Campaign `c20261106033047-6024c2`: Besu 26.8.0, chain 252701, horizon 1,200, trace on, 10 of 10 runs completed.
- Host CPU turbo off.

## Disclosures

- **The Besu campaign spans two simulator versions.** The repository was updated (`git pull`) while the campaign
  ran:
  - R0-A3r and R0-A9 ran at commit `493cc39` (sim.mjs `528c08f3`);
  - R1–R4 ran at `9885bf2` (sim.mjs `359052ce`).

  The difference adds attackers A10 and A10i and does not touch A3r or A9. The dashboard now flags any run that
  starts with a different `sim.mjs` from the one its campaign was queued with (`simChanged`). Don't pull while a
  campaign runs.
- **The A3r defect.**
  - **What went wrong.** The fee multiplier for replacements never reset between stalls, and A3r stopped after
    8 replacements per wallet.
  - **How much it mattered.** On an interval-mined local node over 200 steps, the defective version made 14
    replacements and the fixed version 25.
  - **The redesign.** A3r now clears the whole stuck queue: after 2 blocks without progress, it replaces the stuck
    nonce with a payable transfer and up to 40 queued nonces behind it with zero-value transfers. That version
    made 36 replacements in the same test.
  - **Confirmed from the Besu bundle (`besu-s7.json.gz`).** In R0-A3r, A3r made 16 replacements, 8 on each of two
    wallets, all with value 0. It hit the limit by step 75 on hot wallet 14 and by step 103 on wallet 16. From then
    on, hot wallet 14's nonce stalled exactly as under A3: steps 76–201, then 201–1,071. So the 200M USDT
    replenishment at step 411 was never taken. The defect explains the gap; the fixed A3r is to be rerun.

## What A9 did on Besu

- **R0-A9.** Besu admitted A9's queued transfers (59 queued, 434 ETH each beyond the balance). The loss is only
  USD 2.0M above A3's, because the 200M USDT replenishment is a token transfer, which A9 does not queue.
- **The queue hurt customers instead.** Only 64 customer withdrawals landed (A3: 140). 378 were refused with
  "Transaction nonce is too distant from current sender nonce", because the attacker's queue filled Besu's
  per-sender limit.
- **R1-A9 and R3-A9.** The signer refused every queued transfer for budget (3,443 and 3,446 times), so these runs
  equal A3, as on Hardhat.
