---
id: 2024-05-dmm-bitcoin
date: 2024-05-31
victim: DMM Bitcoin
universe: U1
loss_usd: 305000000
loss_usd_range: 305000000-308000000
chains: Bitcoin
access: Social engineering of an employee at Ginco (DMM's wallet-software provider) via a fake LinkedIn recruiter and a malicious "pre-employment test" script (March 2024); stolen session cookies used to impersonate the employee (mid-May)
authorization: signing-request-manipulation
detection: Unauthorized outflow detected by DMM Bitcoin on May 31, 2024
response: FBI/DC3/Japan NPA attribution (TraderTraitor) on Dec 23-24, 2024; DMM Bitcoin agreed to transfer accounts and assets to SBI VC Trade (Dec 2, 2024)
ibs_status: evaluated
ibs_controls: C1, C2, C3, C4
ibs_note: Law enforcement states the attackers manipulated a legitimate transaction request from a DMM employee, which is the signing-request manipulation class IBS targets; binding the signature to an independently issued intent (C1) and a per-transaction exposure limit (C3) apply directly.
attacker_model: A1-like (request manipulation); A5 (planned)
evidence: two-source
disputed: Loss given as $305M or $308M depending on valuation time
---
# DMM Bitcoin, May 2024

4,502.9 BTC (48.2 billion yen) left DMM Bitcoin after attackers who had compromised its wallet-software provider
Ginco manipulated a legitimate transaction request made by a DMM employee.

## Facts and sources

- Amount, attribution and mechanism: joint FBI / DC3 / National Police Agency of Japan statement (Dec 23-24, 2024), as reported by Cointelegraph, Infosecurity Magazine and CoinDesk.
- Initial access via LinkedIn recruiter and malicious script; Ginco's role: Infosecurity Magazine; GIGAZINE (citing the FBI release and DMM Bitcoin notices).

## Sources

- https://www.fbi.gov/news/press-releases/fbi-dc3-and-npa-identification-of-north-korean-cyber-actors-tracked-as-tradertraitor-responsible-for-theft-of-308-million-from-bitcoindmmcom (primary; cited via GIGAZINE, accessed 2026-10-31)
- https://cointelegraph.com/news/fbi-reveals-dmm-crypto-hack-300m-north-korea (accessed 2026-10-31)
- https://www.infosecurity-magazine.com/news/us-japan-north-korea-crypto-heist (accessed 2026-10-31)
- https://gigazine.net/gsc_news/en/20241225-dmm-bitcoin-north-korea (accessed 2026-10-31)
