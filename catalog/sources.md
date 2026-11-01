# Candidate sources

Where candidates come from, so completeness can be checked and repeated.

| Source | Type | Status | Notes |
|---|---|---|---|
| DeFiLlama hacks dataset (`https://api.llama.fi/hacks`) | Systematic base list (all target types, with classification and technique) | **Pending**: snapshot to be downloaded on the research VM and committed as `data/defillama-hacks-<date>.json` | The workspace network filter blocks the API; a web reader only skims the 110k-character response and missed major entries, so it is not used for completeness |
| Searches for each year 2025-2026 | Gap filling for incidents after the knowledge base of earlier lists | In progress | Found Bitget (Sept 2026) and the leads below |
| Community lists on GitHub (web-n-composite/crypto-hacks-list; demining/list-of-cryptocurrency-exchange-hacks) | Secondary cross-check | Not yet used | Stop in 2022-2023 |

# Leads found but not yet verified

Each will be verified (two sources) and placed in the universe or in `excluded.csv` with a reason.

| Lead | Reported figure | Where it surfaced | Open question |
|---|---|---|---|
| Kelp (2026) | $280M, North Korea-linked | Northeast Times (Bitget article, Sept 2026) | Universe: privileged signing path (U3) or contract bug? |
| Drift (2026) | $290M, North Korea-linked | Northeast Times (Bitget article, Sept 2026) | Universe: U3 or contract bug? |
| Liquid Network (Sept 2026) | about $320M, attackers claimed "white hat" | investingLive, citing DeFiLlama | Universe and whether funds were returned |
| COLDCARD wallet RNG flaw (2026) | $88M Bitcoin theft, "likely linked" | BleepingComputer related-article list | Self-custody hardware: likely outside U1 (no custodian); decide and record |
