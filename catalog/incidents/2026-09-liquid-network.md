---
id: 2026-09-liquid-network
date: 2026-09-06
victim: Liquid Network (Blockstream sidechain federation)
universe: U2
loss_usd: 320000000
chains: Liquid (Elements), Bitcoin
access: A bug in how Elements cached range-proof validation let the attacker create about 3,998.5 unbacked L-BTC, which were redeemed for real BTC through a peg-out that looked legitimate and was signed by the federation's 11-of-15 multisig. No peg-out key was compromised (SideSwap; Liquid)
authorization: contract-bug
detection: Same day; Liquid halted new transactions on Sept 6
response: Patch deployed by 01:09 UTC Sept 7. Self-described white hats returned about 3,400 BTC (about $262M-270M) and kept about 598.5 BTC (about $47M). Block production resumed on Sept 10 with Elements v23.3.4
ibs_status: out-of-scope
ibs_controls: S2
ibs_note: A validation bug in node software (S2); the federation's signers signed a peg-out that the buggy rules accepted. Not a signer compromise, but notable: one peg-out took about 95% of reserves. A per-window exposure budget enforced by the signers (C3) would have capped it, whatever the cause.
attacker_model: none (S2)
evidence: two-source
---
# Liquid Network, September 2026

A caching bug in Elements let unbacked L-BTC be created and pegged out for about 4,000 BTC (about $320M) from the
federation wallet. Most of it was returned.

## Facts and sources

- Mechanism (unbacked L-BTC, no key compromise), 11-of-15 federation: Gizmodo; Coin360 (SideSwap); Halborn.
- Returns, retained amount, resumption and cache-key fix: Security Affairs; Cointelegraph via LCX.

## Sources

- https://gizmodo.com/hackers-drain-320-million-from-bitcoins-liquid-network-keep-47-million-for-themselves-in-white-hat-operation-2000808262 (accessed 2026-11-18)
- https://coin360.com/news/liquid-network-4000-btc-elements-bug (accessed 2026-11-18)
- https://www.halborn.com/blog/post/explained-the-liquid-network-hack-september-2026 (accessed 2026-11-18)
- https://securityaffairs.com/198697/cyber-crime/hackers-drain-320-million-from-liquid-network-then-return-most-of-it.html (accessed 2026-11-18)
- https://lcx.com/en/cryptonews/liquid-network-resumes-block-production-after-320m-exploit (accessed 2026-11-18)
