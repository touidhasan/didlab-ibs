---
id: 2023-11-poloniex
date: 2023-11-10
victim: Poloniex
universe: U1
loss_usd: 126000000
loss_usd_range: 114000000-126000000
chains: Ethereum, Tron, Bitcoin
access: Hot-wallet private keys most likely leaked; Lazarus Group suspected (Halborn; X-explore). The attack transactions used the legacy transaction type, unlike Poloniex's normal EIP-1559 withdrawals (X-explore)
authorization: key-theft
detection: Same day; PeckShield and Cyvers flagged it; Poloniex disabled its wallet about half an hour after the drain began
response: Wallet disabled; owner pledged full reimbursement; a white-hat bounty was offered
ibs_status: evaluated
ibs_controls: C3, C4
ibs_note: The transaction-type mismatch indicates the keys were used outside Poloniex's own signer (S1). A watcher checking outflows against the intent ledger (C4) would flag such transactions at once, and an on-chain budget (C3) bounds what leaves in the half hour before response.
attacker_model: A6 (planned)
evidence: two-source
disputed: Loss: about $114M (early estimate) to $126M
---
# Poloniex, November 2023

About $126M was drained from Poloniex hot wallets on three chains, most likely with leaked private keys.

## Facts and sources

- Amount by chain: PeckShield via Unchained. Key leak and attribution: Halborn; X-explore via Bitcoin.com.
- Time to wallet shutdown: Rekt.

## Sources

- https://halborn.com/blog/post/explained-the-poloniex-hack-november-2023 (accessed 2026-11-18)
- https://unchainedcrypto.com/crypto-exchange-poloniex-loses-125m-in-hack/ (accessed 2026-11-18)
- https://news.bitcoin.com/poloniex-hack-analysis-north-korean-hacking-syndicate-lazarus-group-suspected-in-wallet-breach (accessed 2026-11-18)
- https://alpha.rekt.news/poloniex-rekt (accessed 2026-11-18)
