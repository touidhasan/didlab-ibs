# Besu vs Hardhat: the R0 610 ETH gap — 2026-10-31

**Observation.** First Besu runs (`BACKEND=rpc`, chain 252701, HORIZON=230, seed 7):

| Run | Besu | Hardhat | Difference |
|---|---|---|---|
| R0-A1 | $2,997.1M (ETH 196,249) | $2,998.5M (ETH 196,859) | −610 ETH; USDT/USDC identical |
| R0-A2 | $3,035.1M (ETH 196,260) | $3,036.5M | −$1.4M |
| R2-A1 | $0.0M, detect/contain +2.03 s | $0.0M | identical outcome |
| R3-A3 | $24.0M, alert +0.10 s, contain +2.05 s | $24.0M | identical outcome |

EIP-7702 behaviour identical: 35 of 50 authorizations applied, nonce 56 → 91, on both.

**Hardhat trace (TRACE=1, R0-A1).** Sweep at step 17 empties hot wallet 14. Between steps 17 and 199,
60 benign ETH withdrawals from that wallet (total **610.2 ETH**) are rejected at submission for insufficient
funds. The 1,700 ETH replenishment arrives at step 200; the attacker sweeps again at step 217.

**Hypothesis.** Besu accepts the underfunded withdrawals into its transaction pool and executes them when
the replenishment arrives, before the step-217 sweep; Hardhat rejects them.

**Confirmed (Besu, TRACE=1, R0-A1, HORIZON=230, seed 7).** Same loss as the untraced run ($2,997.1M).

| Step | hot14 ETH | hot14 nonce | Hardhat nonce |
|---|---|---|---|
| 16 | 167,190.4 | 106 | 106 |
| 17 (sweep) | 1.0 | 106 | 106 |
| 199 | 1.0 | **107** | 215 |
| 200 (replenishment arrives) | 1,701.0 | 107 | 216 |
| 201 | **1,089.8** | **277** | 217 |
| 216 | 1,068.5 | 292 | 232 |
| 217 (sweep) | 1.0 | 293 | 233 |

- After the step-17 sweep, the first underfunded withdrawal from hot wallet 14 (nonce 107) stayed in Besu's
  pool and **blocked every later transaction from that wallet** for 183 steps (nonce stuck at 107).
- When the 1,700 ETH replenishment landed at step 200, **170 queued transactions executed in one block**
  (nonce 107 → 277). The queued ETH withdrawals took 611.2 ETH before the attacker's next sweep; the queued
  USDT withdrawals reverted (the wallet had no USDT).
- Benign landing on Besu: 156 succeeded, 121 reverted, 39 never mined, 0 rejected at submission.
  Hardhat: 101 succeeded, 215 rejected at submission.
- Besu accepted a large backlog of pending transactions from an account that carried an active EIP-7702
  delegation. Whether other clients (e.g. Geth, which limits in-flight transactions for delegated accounts)
  behave the same is untested.

**Interpretation.** The developer simulator rejects underfunded transactions at submission; this production
client queues them in nonce order and releases the whole backlog when funds arrive. The measured loss
therefore depends on client mempool semantics, and on a real chain a compromised wallet's stuck backlog
absorbs part of any replenishment. Single seed, one client; to be repeated across seeds and full horizon.

**Measurement correction.** `benign.completed` counts withdrawals signed and sent. The new
`benignLanded` field counts what actually executed. Hardhat R0-A1 (HORIZON=230): 101 landed, 215 rejected
at send — the wallet had been emptied. Earlier results describing benign "completed" counts should be read
as "signed and sent".
