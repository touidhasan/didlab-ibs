---
id: 2022-02-wormhole
date: 2022-02-02
victim: Wormhole (Portal) bridge
universe: U2
loss_usd: 326000000
loss_usd_range: 320000000-338000000
chains: Solana, Ethereum
access: The Solana program's signature check used a deprecated instruction loader without an address check, so the attacker passed a forged verification and minted 120,000 wETH without guardian signatures
authorization: contract-bug
detection: Same day; exploited 18:24-18:28 UTC, patched 00:33 UTC Feb 3
response: Jump Crypto replenished 120,000 ETH; a $10M bounty was offered
ibs_status: out-of-scope
ibs_controls: S2
ibs_note: Verification bug (S2); the guardians never signed. A per-window budget (C3) on the Ethereum-side unlock would still have capped the 93,750 ETH bridged back, whatever the cause.
attacker_model: none (S2)
evidence: two-source
---
# Wormhole, February 2022

The attacker bypassed signature verification in Wormhole's Solana program, minted 120,000 unbacked wETH, and
bridged 93,750 ETH back to Ethereum.

## Facts and sources

- Mechanism: Halborn; Kudelski Security (timeline). Amount bridged back: The Register.
- Replenishment by Jump Crypto: The Block.

## Sources

- https://halborn.com/explained-the-wormhole-hack-february-2022/ (accessed 2026-11-18)
- https://research.kudelskisecurity.com/2022/02/03/quick-analysis-of-the-wormhole-attack/ (accessed 2026-11-18)
- https://www.theregister.com/2022/02/04/wormhole_currency_theft/ (accessed 2026-11-18)
- https://www.theblock.co/post/132909/wormhole-replenishes-its-blockchain-bridge-after-325-million-exploit (accessed 2026-11-18)
