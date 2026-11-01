---
id: 2026-10-binance
date: 2026-10-29
victim: Binance
universe: U1
loss_usd: 6360000000
loss_usd_range: 6300000000-6360000000
chains: Ethereum and about nine other chains (10 total), including XRP, Arbitrum
access: Attacker reached a service container in Binance's withdrawal/signing infrastructure (reported); attacker infrastructure funded via Tornado Cash on Oct 28
authorization: signing-request-manipulation
detection: Same evening; hot wallet emptied 20:20-20:24 UTC; deposits and withdrawals paused
response: Stablecoin issuers froze funds (Tether about 971M USDT, Circle about 823M USDC); Arbitrum Security Council moved about $30M; Binance reports about $3B frozen and states it found no evidence of private key leak and will cover losses
ibs_status: evaluated
ibs_controls: C1, C2, C3, C4
ibs_note: The reference incident for this research: the exchange's own signer signed EIP-7702 delegations and withdrawals requested by compromised orchestration. Reproduced in the testbed (A1); IBS configurations R2-R4 contained it in simulation and on Besu (see testbed/results).
attacker_model: A1, A2
evidence: two-source
disputed: Total loss estimates $6.3B (Binance) and $6.36B (TRM Labs, via Wikipedia); attribution to TraderTraitor reported but not confirmed by law enforcement as of 2026-10-31
---
# Binance, October 2026

The largest crypto theft recorded. Over about 20 minutes on October 29, 2026, attackers withdrew roughly $6.3B from
Binance hot wallets on ten chains. On Ethereum, a signed EIP-7702 delegation turned hot wallet "Binance 14" into
a sweeper; 167,464 ETH and 63 tokens, including 1.615B USDT, left the wallet minutes later.

Independent on-chain investigation of this incident: `../../docs` (investigation and briefing, outside this catalog).

## Facts and sources

- Total, chains, duration, CEO statement on EIP-7702: Wikipedia (citing TRM Labs for $6.36B).
- Amounts frozen; "no evidence of any wallet private key leak": ABC News (Binance spokesperson).
- Timeline and Binance 14 / Binance 16 transfers; stablecoin freezes: Cryptonews; SOCRadar.

## Sources

- https://en.wikipedia.org/wiki/2026_Binance_hack (accessed 2026-10-31)
- https://www.abc.net.au/news/2026-10-30/largest-cryptocurrency-hack-billions-stolen-binance/107327732 (accessed 2026-10-31)
- https://cryptonews.net/news/security/33673751/ (accessed 2026-10-31)
- https://socradar.io/blog/binance-hack-6-3b-hot-wallet-theft/ (accessed 2026-10-31)
