---
id: 2018-02-bitgrail
date: 2018-02-08
victim: BitGrail
universe: U1
loss_usd: 170000000
loss_usd_range: 170000000-195000000
chains: Nano (XRB)
access: Disputed. The owner blamed a flaw in Nano's software; the Nano team, and the Italian bankruptcy court's technical expert as reported, point to BitGrail's own withdrawal software, which allowed double withdrawals
authorization: unknown
detection: BitGrail announced on Feb 9, 2018 that internal checks had found a 17M XRB shortfall; withdrawals had been restricted in the preceding weeks
response: Exchange closed; an Italian court declared it bankrupt and seized the owner's assets (ruling made public January 2019)
ibs_status: disputed
ibs_controls: C1, C3 (only if the exchange's own software signed withdrawals that exceeded user balances)
ibs_note: If the Nano team and the court are right, the custodian's own system signed withdrawals that no ledger balance supported; binding each withdrawal to an intent checked against the ledger by an independent authority (C1) and a per-window budget (C3) target exactly that. If a protocol flaw was the cause, IBS does not apply.
attacker_model: none (custodian ledger bug; not modelled)
evidence: two-source
disputed: Cause (exchange software vs Nano protocol). Start date: the date field is the disclosure date; victims' filings say the losses began in October 2017
---
# BitGrail, February 2018

BitGrail disclosed that 17 million XRB (about $170M; $195M at the Feb 8 price) were missing from its wallet.
The cause is contested between the exchange's owner and the Nano developers. An Italian court ruled against the owner.

## Facts and sources

- Amount and disclosure: Bitcoin Magazine; Fortune.
- Competing causes; court findings as reported by victims: Bitcoin Magazine; Crowdfund Insider; Decrypt.

## Sources

- https://bitcoinmagazine.com/?p=22598 (accessed 2026-11-18)
- https://bitcoinmagazine.com/?p=22305 (accessed 2026-11-18)
- https://www.crowdfundinsider.com/?p=144038 (accessed 2026-11-18)
- https://decrypt.co/4679/court-rules-against-bitgrail (accessed 2026-11-18)
- https://fortune.com/crypto/2018/02/11/bitgrail-cryptocurrency-claims-hack (accessed 2026-11-18)
