# erinle2025sokwallets — SoK: Cryptocurrency Wallets (Computer Networks 2025)

Erinle, Kethepalli, Feng, Xu. *SoK: Design, Vulnerabilities, and Security Measures of Cryptocurrency
Wallets.* Computer Networks 273 (2025) 111691. doi:10.1016/j.comnet.2025.111691.
Copy read: **arXiv v5 (4 Nov 2025)**, marked "Preprint submitted to Elsevier", 27 pages,
sha256 `423bd4ff…b24d` (held locally, not in git). Page numbers are PDF pages.

## What it is
A design taxonomy covering custodial, shared-custody (MPC), non-custodial and smart-contract wallets;
a threat model and multi-layer attack framework; an incident analysis; a classification of
defences as precautionary or remedial; two case studies (Bybit, Slope). (pp. 1–2)

## Numbers worth citing
- v5: 85 incidents, 2012–2025, $6.98B total. Earlier versions said 84 incidents, 2012–2024, $5.4B.
  (pp. 1, 13)
- Defence catalogue (Table 6): 29 distinct methods; 26 precautionary, 7 remedial; only 1 response
  method and 1 recovery method. The authors themselves note that precautionary defences far
  outnumber remedial ones. (p. 16)
- Custody models: omnibus versus segregated addresses for custodial wallets. (p. 6)

## Bybit case study (pp. 15–16)
The multisig enforced whitelisting and transfer limits, but the design let `delegatecall` overwrite
the implementation slot without strict access control, and signers trusted a manipulated UI and
blind-signed. The authors' recommendations stay at the signer and wallet level: clear signing,
audits of storage layout and of `delegatecall` allowlists, secure developer environments.

## Use in our papers
- **The survey ours must cite and extend.** It is the broadest wallet SoK; position IBS as covering
  the custodial signing *pipeline* (orchestration to signer to chain), which their taxonomy treats
  as design attributes, not as a path to defend.
- **C4 gap evidence.** One response method out of 29 is a clean, citable number.
- **C2 evidence from Bybit.** Policies (whitelist, limits) existed and were bypassed through an
  upgrade path; semantic deny-by-default on `delegatecall` and upgrades is the missing piece.
- **Catalog cross-check.** Their dataset (github.com/xujiahuayz/crypto-wallets) is a second source
  for our incident catalog.

## Cautions
- Before citing numbers, check which figures the journal version prints. If we cite the journal, use
  its numbers; if we use v5's, cite "arXiv v5".
