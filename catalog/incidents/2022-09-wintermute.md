---
id: 2022-09-wintermute
date: 2022-09-20
victim: Wintermute
universe: U3
loss_usd: 160000000
loss_usd_range: 160000000-162200000
chains: Ethereum
access: The admin address of Wintermute's DeFi vault was a vanity address generated with Profanity, whose 32-bit seed made the key recoverable by brute force (disclosed by 1inch on Sept 15). Wintermute had moved ETH out of the address but had not removed its admin rights
authorization: key-theft
detection: Same day; the CEO announced the loss on Sept 20
response: Wintermute said it remained solvent; Amber Group reproduced the key recovery in 48 hours on a laptop
ibs_status: evaluated
ibs_controls: C3, C4
ibs_note: Weak key generation, which is outside IBS, gave the attacker a raw admin key, used directly on the vault (S1). On-chain withdrawal budgets (C3) and a watcher (C4) limit such a drain. Revoking the privileges of keys made by a generator known to be flawed is key hygiene, also outside IBS.
attacker_model: A6 (planned)
evidence: two-source
disputed: The DeFiLlama dataset classifies the incident as phishing; every source found attributes it to the Profanity key weakness
---
# Wintermute, September 2022

About $160M was taken from Wintermute's Ethereum vault with the private key of its vanity admin address, which
had been generated with the flawed Profanity tool.

## Facts and sources

- Cause and amount: The Block; Beosin; CertiK via Cointelegraph.
- Reproduction of the key recovery: Amber Group via The Block.

## Sources

- https://www.theblock.co/post/171192/experts-blame-a-vanity-address-bug-for-wintermutes-160-million-hack (accessed 2026-11-18)
- https://beosin.com/resources/beosin-160-million-lost-in-wintermute%E2%80%99s-exploit (accessed 2026-11-18)
- https://cointelegraph.com/news/well-known-vulnerability-in-private-keys-likely-exploited-in-160m-wintermute-hack (accessed 2026-11-18)
- https://www.theblock.co/post/174055/amber-group-reproduces-wintermute-exploit-in-48-hours-using-an-apple-macbook (accessed 2026-11-18)
