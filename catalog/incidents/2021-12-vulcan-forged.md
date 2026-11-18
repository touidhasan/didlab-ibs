---
id: 2021-12-vulcan-forged
date: 2021-12-13
victim: Vulcan Forged (MyForge wallets)
universe: U1
loss_usd: 140000000
loss_usd_range: 135000000-140000000
chains: Ethereum, Polygon
access: The attacker exploited Vulcan Forged's servers, obtained its credentials for the wallet provider Venly, and used them to extract the private keys of 96 users' semi-custodial wallets (CEO Jamie Thomson). Venly said its own systems were not compromised
authorization: key-theft
detection: Same day; Vulcan Forged announced it on Dec 12-13
response: Vulcan Forged promised to replace the stolen PYR from its treasury (about half reimbursed within days) and to move to non-custodial wallets
ibs_status: evaluated
ibs_controls: C3, C4
ibs_note: The keys were exported through the platform's credentials and then used directly (S1). Signer checks cannot act once keys leave the signer. Counterfactual: with non-exportable keys behind an IBS-checked signing API, the same stolen credentials could only request signatures, a signing-request attack that C1 and C3 address.
attacker_model: A6 (planned)
evidence: two-source
disputed: The DeFiLlama dataset classifies the victim as a DeFi protocol. The stolen keys belonged to users' wallets that the platform managed, so the catalog places it in U1
---
# Vulcan Forged, December 2021

4.5 million PYR (about $140M) and other tokens were taken from 96 user wallets after their keys were extracted
through Vulcan Forged's wallet-provider credentials.

## Facts and sources

- 96 keys, amount, semi-custodial wallets via Venly: The Block; Decrypt.
- Root cause (servers exploited, Venly credentials used to extract keys): CEO video via Forkast.

## Sources

- https://www.theblock.co/post/127270/96-private-keys-stolen-from-vulcan-forged-in-140-million-theft (accessed 2026-11-18)
- https://decrypt.co/88177/hacker-steals-140-million-polygon-gaming-platform-nft-marketplace-vulcan-forged (accessed 2026-11-18)
- https://forkast.news/vulcan-forged-replaces-token-stolen-hack/amp/ (accessed 2026-11-18)
