# Related-work survey: securing the signing path of custodial wallets

Systematic review of academic work, standards and industry practice relevant to Intent-Bound Signing (IBS).
Feeds the related-work sections of the papers and the proposal; may later become a peer-reviewed SoK
(arXiv CS no longer posts standalone surveys without prior peer review).

## Research questions

- **RQ1** How do custodians and wallets authorize transactions today, and where in that path do attacks succeed?
- **RQ2** Which defenses bind a signature to what the user or business actually intended, and what does each assume
  is trustworthy (UI, signer device, orchestration, policy engine)?
- **RQ3** Which defenses detect or contain unauthorized outflows after signing, and how fast?
- **RQ4** How are these defenses evaluated (formal, simulation, testbed, deployment, incident analysis), and how
  realistic is the evaluation?
- **RQ5** What does the account-abstraction era (ERC-4337, EIP-7702, smart accounts, intents) change?

## Taxonomy

| Code | Category |
|---|---|
| T1 | Empirical studies of custody, exchange and bridge incidents |
| T2 | Key management and signing infrastructure: HSM, multisig, MPC/threshold signatures, TEEs |
| T3 | Transaction authorization policy: allowlists, limits, policy engines, guards, timelocks, session keys |
| T4 | Intent and display integrity: blind signing, clear signing, typed data, simulation, UI deception |
| T5 | Account abstraction and delegation: ERC-4337, EIP-7702, smart accounts, intents |
| T6 | Monitoring, detection and response: on-chain detection, circuit breakers, automatic pause |
| T7 | Bridges and validator-signed systems |
| T8 | Evaluation infrastructure: simulators, testbeds, client behaviour, mempool semantics |
| T9 | Endpoint, supply-chain and human-factor attacks on signers |
| T10 | Standards and industry frameworks (graded as grey literature) |

## Inclusion

- Peer-reviewed papers (conferences, journals, workshops), arXiv preprints (marked `preprint`), standards
  and EIPs/ERCs (marked `standard`), and vendor/industry documents (marked `grey`).
- Relevant to RQ1-RQ5. Older foundational work is included when later work builds on it.
- Search sources and queries are logged in `search-log.md` so the search can be repeated.

## Verification rule

**No reference enters `references.bib` or `matrix.csv` unless its existence, title, authors and venue/year have
been confirmed against a source page (publisher, arXiv, DBLP, author page, or the standard itself), with that URL
recorded.** Fields that could not be confirmed are marked `unverified` and the entry is not cited until fixed.
Every reference is re-checked before any paper is submitted.

## Extraction fields (`matrix.csv`)

| Field | Meaning |
|---|---|
| `key` | BibTeX key |
| `type` | paper / preprint / standard / grey |
| `year`, `venue` | As confirmed |
| `category` | T1-T10 (primary; secondary after `;`) |
| `problem` | One line |
| `trust_assumption` | What the approach assumes is trustworthy (e.g. signer device, UI, orchestration, policy server) |
| `independent_intent` | Does the approach check the signature against an intent from an independent trust domain? yes / no / partial |
| `post_sign_containment` | Does it detect or contain after signing? yes / no / partial |
| `evaluation` | formal / simulation / testbed / deployment / incident analysis / none |
| `ibs_relation` | Which IBS control (C1-C4) it relates to, and how (prior art, complement, competitor, evidence) |
| `gap` | What it leaves open that matters for signing-path compromise |
| `url` | Verification link |

## Files

| File | Content |
|---|---|
| `references.bib` | Verified references only |
| `matrix.csv` | One extraction row per reference (fields above) |
| `pending.md` | Found but not yet verified; not cited |
| `search-log.md` | Every query, source and outcome, so the search can be repeated |
| `gap-analysis.md` | Synthesis: what each layer of defense covers, partial prior art per IBS control, threats to validity |
