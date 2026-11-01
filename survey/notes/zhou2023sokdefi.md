# zhou2023sokdefi — SoK: DeFi Attacks (IEEE S&P 2023)

Zhou, Xiong, Ernstberger, Chaliasos, Wang, Wang, Qin, Wattenhofer, Song, Gervais. *SoK: Decentralized
Finance (DeFi) Attacks.* 2023 IEEE Symposium on Security and Privacy, pp. 2444–2461.
doi:10.1109/SP46215.2023.10179435.
Copy read: IEEE Xplore PDF via UMKC library, 18 pages, sha256 `bc2bc309…5a7a` (held locally, not in
git; licensed copy, do not share). Page numbers are PDF pages.

## What it is
A five-layer reference frame (network, consensus, smart contract, protocol, auxiliary) with a threat
model, applied to 181 incidents, 77 papers and 30 audit reports. Also measures audits, emergency
pauses, rescue windows, bytecode similarity and money tracing. (pp. 1–2)

## Numbers worth citing
- 181 incidents on Ethereum and BSC, 30 Apr 2018 – 30 Apr 2022, at least $3.24B lost. (p. 1; the
  text also lists 117 Ethereum + 69 BSC, which sums to 186, so cite the 181 total.)
- 103 attacks (56%) were not atomic, leaving a rescue window for defenders. (pp. 1–2, 9)
- 87 of 183 victims (47.5%) had an emergency pause; only 51 of those 87 paused within 48 hours, and
  only one within the first hour. (p. 9)
- Average rescue window for protocol-layer attacks about 1 hour (± 4.1 h), longest 26.5 hours. (p. 10)
- Table III lists "compromised private key / wallet" under operational-layer causes: 22 incidents
  (12%), with few academic papers addressing it. (p. 6; read off the rotated table, so re-check the
  column before quoting.)

## Use in our papers
- **C4 motivation in two steps.** A window to respond usually exists (56% non-atomic), but
  human-triggered pauses almost never act inside it (1 of 87 within an hour). This is the case for
  *autonomous* containment.
- **Gap statement.** Key/wallet compromise is a known incident class that academic tools rarely
  address (Table III); IBS targets it.
- **Taxonomy.** Use their layer names when we place custodial signing (it sits in their auxiliary or
  operational layer, outside the protocol).

## Cautions
- DeFi protocols only; custodial exchange incidents are outside their data. Do not cite their loss
  totals as exchange losses.
