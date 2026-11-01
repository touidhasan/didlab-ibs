---
id: 2024-10-radiant-capital
date: 2024-10-16
victim: Radiant Capital (DeFi lending protocol)
universe: U3
loss_usd: 50000000
loss_usd_range: 48000000-53000000
chains: Arbitrum, BNB Chain
access: Malware delivered via Telegram (impersonated former contractor, Sep 11) compromised at least three developers' devices
authorization: blind-signing
detection: Security monitoring alerts fired (ownership transfer, contract upgrade) during the attack
response: Lending markets paused; Mandiant engaged; signer set reduced to 7 with a 4-of-7 threshold
ibs_status: evaluated
ibs_controls: C1, C2, C4
ibs_note: Hardware wallets blind-signed payloads replaced by malware while the interface showed legitimate data; ownership transfer of the lending pool provider is exactly the operation a deny-by-default policy (C2) would refuse without a dedicated, independently issued intent; alerts existed, so autonomous containment (C4) is the comparison point.
attacker_model: A5 (planned)
evidence: two-source
disputed: Loss reported as about $50M (post-mortem) to $53M (including approvals drained)
---
# Radiant Capital, October 2024

Attackers compromised developers' devices with malware; when the team signed routine multisig operations, the malware
substituted malicious payloads that transferred ownership of the lending pool, while Safe{Wallet} displayed legitimate
data. Safe's interface itself was not compromised.

## Facts and sources

- Mechanism, loss and post-mortem: Radiant Capital post-mortem (Oct 18, 2024) and incident update (Dec 6, 2024; Mandiant attribution to UNC4736).
- Three developer devices compromised; Safe interface not compromised: Cointelegraph.
- Alerts fired during the attack; loss breakdown: Hacken review.

## Sources

- https://medium.com/@RadiantCapital/radiant-post-mortem-fecd6cd38081 (accessed 2026-10-31)
- https://medium.com/@RadiantCapital/radiant-capital-incident-update-e56d8c23829e (accessed 2026-10-31)
- https://cointelegraph.com/news/radiant-capital-attacker-compromised-multiple-developers-devices-post-mortem (accessed 2026-10-31)
- https://hacken.io/insights/radiant-hack-review/ (accessed 2026-10-31)
