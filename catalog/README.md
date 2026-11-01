# Incident catalog

Every publicly reported incident in the catalog's universe with a loss of **$10M or more** from 2014 to 2026,
with verified facts, the path by which the theft was authorized, and what Intent-Bound Signing (IBS)
would and would not have changed. Incidents that are not evaluated are still listed, with the reason.

## Universe

An incident is in the universe if any of these holds:

- **U1 Custody**: assets were taken from a centralized exchange, custodian, wallet provider, payment
  processor or other service that held keys for users.
- **U2 Bridge**: assets were taken from a cross-chain bridge (any mechanism: keys, validators, contract or proof bugs).
- **U3 Privileged signing path**: assets were taken from any other system (DeFi protocol, DAO treasury,
  foundation) by abusing a privileged key, multisig or signer (key theft, signer manipulation, blind signing).

DeFi incidents caused only by contract logic, oracle or economic attacks, with no privileged signing path,
are **outside the universe** (scope S2 in `../docs/SCOPE_AND_LIMITATIONS.md`) and are not listed.

## Inclusion and exclusion

- **Threshold**: loss of at least $10M (USD at the time of the incident, valuation source recorded).
  Below-threshold incidents are added only when they introduced a new technique; the reason is recorded.
- **Completeness**: candidates come from systematic sources (`sources.md`), not memory. Every candidate in the
  universe at or above the threshold gets a row. Each row ends in one of:
  - `evaluated` — mapped to IBS controls;
  - `out-of-scope` — listed, with the scope rule that excludes it (e.g. S2 contract bug in a bridge);
  - `insufficient-evidence` — listed, with what is missing;
  - `disputed` — sources conflict on a key fact; both versions recorded.
- **Nothing is dropped silently.** A candidate removed from the universe is kept in `excluded.csv` with the reason.

## Evidence rules

- Every key fact (date, loss, authorization path, root cause) needs **two independent sources**.
  Preferred order: on-chain data; official post-mortem; law-enforcement or regulator statement; court filing;
  independent security analyst; reputable press.
- A fact stated only by the victim is marked `victim-only`.
- Sources are recorded per incident in `incidents/<id>.md` with URLs and access dates.
- Valuations: the figure the sources give at the time of the incident; if sources differ, the range.

## Fields (`incidents.csv`)

| Field | Meaning |
|---|---|
| `id` | `YYYY-MM-<slug>` |
| `date` | Date the theft began (UTC), `YYYY-MM-DD` |
| `victim` | Organization |
| `universe` | U1 / U2 / U3 |
| `loss_usd` | Best-supported figure; `loss_usd_range` if sources differ |
| `chains` | Chains affected |
| `access` | How the attacker got in (e.g. phishing, supply chain, insider, malware, unknown) |
| `authorization` | **How the theft was authorized**: `key-theft`, `account-takeover` (users' API keys/2FA abused so the exchange's own system signs withdrawals), `signing-request-manipulation` (orchestration compromised, real signer signs), `blind-signing` (signers shown false transaction details), `validator-key-compromise`, `contract-bug`, `insider`, `unknown` |
| `detection` | Who detected it and how long after the first theft |
| `response` | Pauses, freezes, recoveries |
| `ibs_status` | `evaluated` / `out-of-scope` / `insufficient-evidence` / `disputed` |
| `ibs_controls` | Which of C1–C4 would apply, or the scope rule that excludes it |
| `ibs_note` | One line: what IBS would and would not have changed (counterfactual, not a claim of prevention) |
| `attacker_model` | Testbed attacker model that represents it (A1–A9), if any |
| `evidence` | `two-source` / `victim-only` / `single-source` |
| `sources` | Path to `incidents/<id>.md` |
