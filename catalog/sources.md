# Candidate sources

Where candidates come from, so completeness can be checked and repeated.

| Source | Type | Status | Notes |
|---|---|---|---|
| DeFiLlama hacks dataset (`https://api.llama.fi/hacks`) | Systematic base list (all target types, with classification and technique) | **Done**: snapshot of 2026-10-31 committed as `data/defillama-hacks-2026-10-31.json` (1,333 entries, 130 candidates via `select.mjs`). A fresh snapshot is needed only for incidents after Oct 31, 2026 | The workspace network filter blocks the API, so snapshots are taken on the research VM. A web reader only skims the 110k-character response and missed major entries, so it is not used for completeness |
| Searches for each year 2025-2026 | Gap filling for incidents after the knowledge base of earlier lists | In progress | Found Bitget (Sept 2026) and the leads below |
| Community lists on GitHub (web-n-composite/crypto-hacks-list; demining/list-of-cryptocurrency-exchange-hacks) | Secondary cross-check | Not yet used | Stop in 2022-2023 |

# Leads found but not yet verified

Each will be verified (two sources) and placed in the universe or in `excluded.csv` with a reason.

| Lead | Reported figure | Where it surfaced | Resolution |
|---|---|---|---|
| Kelp (2026) | $280M, North Korea-linked | Northeast Times (Bitget article, Sept 2026) | Resolved 2026-11-18: U2, signing-request manipulation (`incidents/2026-04-kelp.md`) |
| Drift (2026) | $290M, North Korea-linked | Northeast Times (Bitget article, Sept 2026) | Resolved earlier: `incidents/2026-04-drift.md` |
| Liquid Network (Sept 2026) | about $320M, attackers claimed "white hat" | investingLive, citing DeFiLlama | Resolved 2026-11-18: U2, out of scope (S2), about 85% returned (`incidents/2026-09-liquid-network.md`) |
| COLDCARD wallet RNG flaw (2026) | $88M Bitcoin theft, "likely linked" | BleepingComputer related-article list | Resolved 2026-11-18: excluded as self-custody (`excluded.csv`) |
