---
id: 2019-05-binance
date: 2019-05-07
victim: Binance
universe: U1
loss_usd: 40700000
loss_usd_range: 40000000-42800000
chains: Bitcoin
access: Phishing, viruses and other attacks against users to obtain many user API keys, 2FA codes and other data
authorization: account-takeover
detection: The withdrawal triggered internal alarms after it executed; withdrawals stopped immediately afterwards
response: Deposits and withdrawals suspended for about a week; loss covered by the SAFU fund
ibs_status: evaluated
ibs_controls: C1, C3, C4
ibs_note: Withdrawals were requested through genuine but stolen user credentials, so the exchange's own system signed them. IBS binds signatures to user-authenticated intents, which does not help when the user's own authentication is stolen; an exposure budget (C3) on a single 7,000 BTC transaction and pre-execution anomaly checks are the relevant controls. Partial coverage.
attacker_model: none (account takeover not yet modelled)
evidence: two-source
---
# Binance, May 2019

About 7,000 BTC left Binance's BTC hot wallet (about 2% of its BTC holdings) in a single transaction, after
attackers collected many user API keys and 2FA codes. Binance said its checks did not block the withdrawal before
execution; alarms fired after it.

## Facts and sources

- Amount, single transaction, hot wallet share, techniques: Binance statement via The Block, PortSwigger, CyberScoop.
- Alarms after execution; withdrawals stopped: CyberScoop (Binance statement).

## Sources

- https://www.theblock.co/amp/linked/22448/security-breach-on-binance-results-in-a-loss-of-7000-btc (accessed 2026-10-31)
- https://portswigger.net/daily-swig/hackers-steal-40m-in-bitcoin-from-crypto-exchange-binance (accessed 2026-10-31)
- https://cyberscoop.com/binance-cryptocurrency-exchange-hacked-bitcoin/ (accessed 2026-10-31)
