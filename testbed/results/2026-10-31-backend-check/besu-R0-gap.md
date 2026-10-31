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

**Hypothesis (to confirm with a Besu TRACE=1 run).** Besu accepts the underfunded withdrawals into its
transaction pool and executes them when the replenishment arrives, before the step-217 sweep; Hardhat
rejects them. The 610.2 ETH then goes to customers instead of the attacker.

**Measurement correction.** `benign.completed` counts withdrawals signed and sent. The new
`benignLanded` field counts what actually executed. Hardhat R0-A1 (HORIZON=230): 101 landed, 215 rejected
at send — the wallet had been emptied. Earlier results describing benign "completed" counts should be read
as "signed and sent".
