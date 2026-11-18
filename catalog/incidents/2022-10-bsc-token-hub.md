---
id: 2022-10-bsc-token-hub
date: 2022-10-06
victim: BSC Token Hub (BNB Chain bridge)
universe: U2
loss_usd: 570000000
loss_usd_range: 566000000-570000000
chains: BNB Chain
access: A forged IAVL range proof was accepted by the BSC Token Hub's proof verifier (CVE-2023-27575); the attacker first registered as a relayer and then withdrew 1,000,000 BNB twice
authorization: contract-bug
detection: Same day
response: Validators halted BNB Chain; about $100M-110M had moved off-chain before the halt; patched Oct 11
ibs_status: out-of-scope
ibs_controls: S2
ibs_note: Proof-verification bug (S2). Containment came from halting the chain, a chain-level analogue of C4 that kept most of the minted BNB on BNB Chain; most bridges cannot do this. Loss is counted at the attacker's first address (S4).
attacker_model: none (S2)
evidence: two-source
---
# BSC Token Hub, October 2022

A forged proof let the attacker withdraw 2 million BNB (about $570M) from the bridge between BNB Beacon Chain and
BNB Smart Chain. Halting the chain kept most of it from leaving.

## Facts and sources

- Mechanism and amount: BNB Chain statement via UPI; SlowMist; Verichains (CVE).
- Amount that left the chain: QuillAudits; SlowMist.

## Sources

- https://www.upi.com/top_news/us/2022/10/07/china-binance-bnb-crypto-tokens-hacked/3561665152050 (accessed 2026-11-18)
- https://slowmist.medium.com/slowmist-an-analysis-of-the-attack-on-bnb-cross-chain-bridge-f7411f33bb2 (accessed 2026-11-18)
- https://blog.verichains.io/p/vsa-2022-101-iavl-spoofing-attack (accessed 2026-11-18)
- https://www.quillaudits.com/blog/hack-analysis/bsc-token-hub-bridge-hack (accessed 2026-11-18)
