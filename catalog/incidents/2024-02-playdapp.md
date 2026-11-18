---
id: 2024-02-playdapp
date: 2024-02-09
victim: PlayDapp
universe: U3
loss_usd: 290000000
loss_usd_range: 32000000-290400000
chains: Ethereum
access: The private key of the contract deployer address was compromised (PeckShield; Elliptic: likely). The attacker added a new minter and minted PLA twice
authorization: key-theft
detection: Same day (PeckShield, Feb 9)
response: PlayDapp offered a $1M bounty on Feb 10. The attacker minted again on Feb 12 (1.59B PLA). The contract was paused on Feb 13, and the token migrated
ibs_status: evaluated
ibs_controls: C2, C3, C4
ibs_note: A stolen deployer key used directly (S1). The decisive gap was the three days between detection and pause, during which the second and larger mint happened. A watcher that freezes on an unexpected minter-role grant (C4), timelocked role changes (C2) and a mint budget (C3) would have stopped at least the second mint.
attacker_model: A6 (planned)
evidence: two-source
disputed: Loss measure. $290M is the market value of 1.79B newly minted PLA at pre-hack prices, against a prior supply of 577M; the attacker could sell only a fraction (ImmuneBytes: about $32M)
---
# PlayDapp, February 2024

With the compromised deployer key, the attacker made itself a minter and minted 200M PLA on February 9 and 1.59B PLA
on February 12, nominally about $290M.

## Facts and sources

- Mints, dates, key compromise: Elliptic; The Block; BleepingComputer (PeckShield).
- Realized amount and pause: ImmuneBytes.

## Sources

- https://elliptic.co/blog/crypto-gaming-platform-playdapp-suffers-290-million-breach (accessed 2026-11-18)
- https://www.theblock.co/post/277334/crypto-gaming-platform-playdapp-loses-290-million-worth-of-tokens-in-two-exploits-elliptic (accessed 2026-11-18)
- https://www.bleepingcomputer.com/news/security/hackers-steal-290-million-in-crypto-from-playdapp-gaming-platform/ (accessed 2026-11-18)
- https://immunebytes.medium.com/playdapp-exploit-feb-9-12-2024-detailed-analysis-report-immunebytes-50e2f57b8bcd (accessed 2026-11-18)
- https://www.immunebytes.com/blog/?p=11092 (accessed 2026-11-18)
