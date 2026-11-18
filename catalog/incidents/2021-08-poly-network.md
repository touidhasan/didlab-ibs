---
id: 2021-08-poly-network
date: 2021-08-10
victim: Poly Network
universe: U2
loss_usd: 611000000
loss_usd_range: 600000000-611000000
chains: Ethereum, BNB Chain, Polygon
access: A crafted cross-chain message made EthCrossChainManager call EthCrossChainData.putCurEpochConPubKeyBytes (a function-selector collision), which replaced the keeper public key with the attacker's
authorization: contract-bug
detection: Same day
response: The attacker returned about $342M within hours and nearly all funds over the following days
ibs_status: out-of-scope
ibs_controls: S2
ibs_note: Contract access-control bug (S2). Notable for IBS: the bug let the attacker install its own key as the bridge's keeper, so every later unlock was validly signed. A per-window budget (C3) on the lock proxy would still have capped the drain.
attacker_model: none (S2)
evidence: two-source
---
# Poly Network, August 2021

The attacker replaced Poly Network's keeper key through a cross-chain call to a privileged function, then
unlocked about $611M on three chains.

## Facts and sources

- Mechanism: SlowMist; Kudelski Security; BlockSec.
- Amount and return of funds: CertiK.

## Sources

- https://slowmist.medium.com/the-root-cause-of-poly-network-being-hacked-ec2ee1b0c68f (accessed 2026-11-18)
- https://kudelskisecurity.com/research/the-poly-network-hack-explained (accessed 2026-11-18)
- https://blocksec.com/blog/the-further-analysis-of-the-poly-network-attack (accessed 2026-11-18)
- https://www.certik.com/resources/blog/poly-network-exploit (accessed 2026-11-18)
