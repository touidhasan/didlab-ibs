---
id: 2018-01-coincheck
date: 2018-01-25
victim: Coincheck
universe: U1
loss_usd: 534000000
loss_usd_range: 530000000-534000000
chains: NEM
access: The attacker obtained the private key of the hot wallet holding all of Coincheck's NEM (Coincheck press conference); how it was obtained was not disclosed in the sources used
authorization: key-theft
detection: About 8.5 hours after the first transfer (about 18:00 UTC Jan 25); Coincheck noticed an abnormal balance drop
response: Trading and most withdrawals halted; the NEM Foundation tagged tainted accounts; Coincheck reimbursed about 260,000 users from its own funds; reported to police and Japan's FSA
ibs_status: evaluated
ibs_controls: C3, C4
ibs_note: All NEM sat in one single-key hot wallet, not a multisig. With raw key theft (S1) the signer's checks are bypassed; a policy co-signer enforcing a per-window budget (C3) would have capped the drain, and a watcher (C4) would have closed the 8.5-hour detection gap.
attacker_model: A6 (planned)
evidence: two-source
---
# Coincheck, January 2018

About 523 million NEM (about $530M-534M) left a single Coincheck hot wallet in several unauthorized transfers around
3 a.m. Tokyo time on January 26, 2018 (UTC: January 25).

## Facts and sources

- Time, amount, hot wallet without multisig, key theft: Coincheck press conference via Cointelegraph and Reuters.
- Official loss of 58 billion yen (about $530M) and reimbursement: Reuters; FinTech Futures.

## Sources

- https://cointelegraph.com/news/coincheck-stolen-534-mln-nem-were-stored-on-low-security-hot-wallet (accessed 2026-11-18)
- https://toyokeizai.net/articles/print-tbt/206538 (Reuters; accessed 2026-11-18)
- https://www.govinfosecurity.com/japanese-cryptocurrency-exchange-suffers-530-million-theft-a-10613 (accessed 2026-11-18)
- https://fintechfutures.com/?p=15093719 (accessed 2026-11-18)
