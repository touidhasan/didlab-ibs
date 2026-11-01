# huang2026darkside — EIP-7702 risks (USENIX Security 2026)

Huang, Liu, Yang, Wu, Wang. *Revealing the Dark Side of Smart Accounts: An Empirical Study of
EIP-7702 Incurred Risks in Blockchain Ecosystem.* 35th USENIX Security Symposium, 2026, pp. 1887–1905.
Copy read: USENIX proceedings PDF, 20 pages, sha256 `e8da6cbd…6fee` (held locally, not in git). Page numbers are PDF pages.

## What it is
A taxonomy of smart-account (EIP-7702) attacks by victim type — EOA-targeted, contract-targeted, and
composite — plus detection tools combining transaction analysis with cross-contract static analysis,
applied to seven EIP-7702 chains. (pp. 2–3)

## Numbers worth citing
- 924 malicious contract accounts detected, some previously unreported. (pp. 2–3)
- Over 63% of 3,664,166 EIP-7702 authorization transactions are tied to malicious EOA-targeted
  attacks; dataset of more than 22.8B transactions. (pp. 3, 12–13)
- About $2.36M lost; about $10.14M exposed to potential compromise. (pp. 3, 15)
- 8,254 of 15,020 contracts rely on a `tx.origin == msg.sender`-style check that smart accounts break.
- Data and code: Zenodo record 17895541. (p. 17)

## Threat model (p. 5)
The attacker cannot steal benign users' private keys; instead some users approve malicious
authorizations (phishing, misleading UI, social engineering). Consumer setting.

## Use in our papers
- **Motivation for attacker A3 and control C2.** Delegation is already abused at scale, and a single
  approved authorization hands over the account. A custodian's signer must therefore deny type-4
  authorizations by default (C2), and the watcher must treat "code appeared at our EOA" as a
  tripwire (C4).
- **The difference we claim.** Their victims are consumers approving a phishing prompt. Our case is a
  custodian whose orchestration asks its signer for a delegation; no human sees a prompt.
- **Legacy-check finding.** Useful in Paper A's background: assumptions such as "this caller is an
  EOA" stopped holding after Pectra.

## Cautions
- The paper prints both 3,664,166 and 3,664,116 for the authorization count (p. 12). Use 3,664,166
  (abstract and most occurrences) or say "about 3.66M".
- It does not recommend monitoring delegated code; our earlier matrix entry said it did and has
  been corrected.
