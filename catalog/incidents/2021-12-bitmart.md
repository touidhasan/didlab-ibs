---
id: 2021-12-bitmart
date: 2021-12-04
victim: BitMart
universe: U1
loss_usd: 196000000
loss_usd_range: 150000000-196000000
chains: Ethereum, BNB Chain
access: A stolen private key compromised two hot wallets (CEO Sheldon Xia); how it was obtained was not disclosed
authorization: key-theft
detection: PeckShield reported it on Dec 4-5; BitMart paused withdrawals
response: Withdrawals paused; BitMart compensated affected users from its own funds
ibs_status: evaluated
ibs_controls: C3, C4
ibs_note: Hot-wallet key theft (S1), so the signer's checks are bypassed. Per-window budgets (C3) on the hot wallets and a watcher with freeze (C4) are the controls that limit it.
attacker_model: A6 (planned)
evidence: two-source
disputed: Loss: about $150M (BitMart) vs about $196M (PeckShield; CertiK about $195M)
---
# BitMart, December 2021

Two BitMart hot wallets, on Ethereum and BNB Chain, were drained after their private key was stolen.

## Facts and sources

- Cause (stolen private key) and BitMart's figure: CEO statements via Decrypt and Trend Micro.
- Independent figure: PeckShield via CPO Magazine; CertiK.

## Sources

- https://decrypt.co/87637/bitmart-compensate-victims-196m-hack-funds?amp=1 (accessed 2026-11-18)
- https://news.trendmicro.com/2021/12/08/crypto-exchange-bitmart-loses-150-million-to-hackers (accessed 2026-11-18)
- https://www.cpomagazine.com/cyber-security/victims-of-bitmart-crypto-theft-to-be-partially-compensated-crypto-exchange-lost-196-million-in-breach-will-return-150-million-to-users/ (accessed 2026-11-18)
- https://www.certik.com/blog/bitmart-hot-wallet-compromise (accessed 2026-11-18)
