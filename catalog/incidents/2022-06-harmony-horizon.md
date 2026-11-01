---
id: 2022-06-harmony-horizon
date: 2022-06-23
victim: Harmony Horizon bridge
universe: U2
loss_usd: 100000000
loss_usd_range: 98000000-100000000
chains: Ethereum, Harmony, BNB Chain
access: Compromise of multisig signer keys, likely via social engineering of team members (Elliptic)
authorization: key-theft
detection: Same day; Harmony announced the theft June 23-24
response: FBI attribution to Lazarus Group and APT38 (Jan 23, 2023); part of the funds frozen
ibs_status: evaluated
ibs_controls: C1, C3, C4
ibs_note: Two stolen keys sufficed under a low multisig threshold. IBS cannot stop theft of signing keys; per-withdrawal intent binding to deposit evidence (C1, if enforced on-chain or by every signer), exposure budgets (C3) and a watcher (C4) limit and detect the drain.
attacker_model: A6 (planned)
evidence: two-source
disputed: Multisig threshold reported as 2-of-5 (Mudit Gupta via The Block) and 2-of-4 (PeckShield via The Record)
---
# Harmony Horizon bridge, June 2022

About $100M (85,000+ ETH and other tokens) was drained from the Horizon bridge after the attacker obtained two
multisig signer keys.

## Facts and sources

- Date, amount, multisig compromise: The Block; The Record (CertiK and PeckShield analyses); Security Affairs.
- Attribution: FBI press release (Jan 23, 2023), via The Block and BleepingComputer.

## Sources

- https://www.theblock.co/post/154357/ (accessed 2026-10-31)
- https://therecord.media/fbi-investigating-100-million-theft-from-blockchain-company-harmony/ (accessed 2026-10-31)
- https://www.theblock.co/post/204928/fbi-confirms-lazarus-group-and-apt38-were-responsible-for-100-million-bridge-hack (accessed 2026-10-31)
- https://securityaffairs.com/141266/apt/harmony-horizon-bridge-lazarus-apt.html (accessed 2026-10-31)
