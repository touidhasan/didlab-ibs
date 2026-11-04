# Scope and limitations register

Living record of what this research covers, what it does not, and why. Every paper, preprint and
proposal built on this repository draws its limitations section from here. Entries are added when a
limitation is found and are never deleted: if one is resolved, it is marked **Resolved** with the commit
or result that resolved it.

Status values: **Open** (applies to current results), **Mitigated** (reduced, still applies),
**Resolved** (no longer applies; kept for history).

## 1. Threat model scope

| ID | Scope statement | Status |
|---|---|---|
| S1 | The attack class is **signing-path compromise**: the attacker controls orchestration (services that request signatures) and makes the custodian's own signer sign. Theft of raw private keys is a different class; IBS limits but does not prevent it (spending caps and the watcher still apply; the signer's checks are bypassed). | Open |
| S2 | Smart-contract logic bugs, bridge proof/verification bugs, and economic attacks (oracle manipulation, flash loans) are **out of scope**. | Open |
| S3 | Insider fraud by the custodian itself (e.g. misuse of customer funds) is out of scope. An insider who controls the intent authority is modelled as attacker A4. | Open |
| S4 | Off-chain laundering, issuer freezes, swaps and cross-chain movement after theft are not modelled; loss is measured at the attacker's first receiving address. | Open |

## 2. Incident catalog rule

- The catalog covers custody and bridge incidents from 2014 to 2026.
- **Every publicly reported incident with a loss of $10M or more is listed.** An incident that is not evaluated
  is still listed, with the explicit reason (e.g. out of scope per S2, insufficient public evidence,
  conflicting sources).
- Smaller incidents are included when they introduced a new technique; the reason is recorded.
- Every key fact needs two independent sources; facts stated only by the victim are marked as such.
- Losses are recorded in USD at the time of the incident, with the source of the valuation.

## 3. Experimental limitations

| ID | Limitation | Status |
|---|---|---|
| E1 | Single EVM chain model; Bitcoin, Solana and other non-EVM legs of real incidents are not simulated. | Open |
| E2 | Software signer only; HSM, MPC and TEE signers are not modelled. | Open |
| E3 | Attackers are scripted (A1–A4), not adaptive learners or human red teams. | Open |
| E4 | Benign traffic is synthetic (log-normal withdrawal sizes, fixed request probabilities), not drawn from real exchange data. | Open |
| E5 | **Hardhat: closed for the 15 core runs.** At seeds 7–11 no outcome changes. Losses stay within 0.06% of the median, except R1 (1.03%) and R3-A3 (4.16%), which differ by one capped transfer. Zero-loss runs stay zero, alarms and containment steps are identical, and the T3 bounds hold at every seed (`testbed/results/2026-11-04-hardhat-5seeds/`). **Besu still has seed 7 only** until the results freeze (CP4). Five seeds are too few for the planned paired tests, so Hardhat moves to 10 seeds per cell (`docs/RESEARCH_FRAMING.md` §7). | Mitigated |
| E6 | One step = one block. The incident timeline uses 12 s steps; the Besu research network produces 2 s blocks. Results in steps transfer; results in seconds are specific to the block period used. | Open |
| E7 | Real-client validation uses one client (Hyperledger Besu 26.8.0) on a private 4-validator QBFT network operated by one institution. It shows feasibility, overhead and client behaviour, not behaviour against real adversaries, real mempools or mainnet economics. | Open |
| E8 | **Simulator and client differ in mempool semantics.** Hardhat rejects underfunded transactions at submission; Besu queues them in nonce order and releases them when funds arrive, which changed the measured loss by 610 ETH in R0-A1 (`testbed/results/2026-10-31-backend-check/besu-R0-gap.md`) and, at full horizon, lowered all three unprotected baselines on Besu: R0-A1 and R0-A2 by $4.0M (0.12%), R0-A3 by $202.6M (8.4%), because a stalled nonce also held back the attacker's own transfers (`testbed/results/2026-11-01-besu-core15/`). All 12 runs with IBS controls (R1–R4) match Hardhat. Comparisons against the baseline use the lower (Besu) figure. The baseline is therefore reported as a range until an attacker that replaces stalled nonces (A3r) is added. Other clients (e.g. Geth) are untested. | Open |
| E9 | `benign.completed` counts withdrawals signed and sent, not executed. Results before 2026-10-31 report only this count; `benignLanded` (added 2026-10-31) reports execution. | Mitigated |
| E10 | Prices are fixed (ETH = $2,300; stablecoins = $1) for loss reporting. | Open |
| E11 | Hardhat runs before 2026-10-31 used a 230- or 1,200-step horizon; partial-horizon runs omit later incident events (steps 884 and 1,076). Each result records its horizon. | Open |
| E12 | Running several rpc campaigns at once on one chain shares block space and CPU and can change timing results. The dashboard runs one at a time by default and records, per run, how many runs were active when it started. | Open |
| E13 | Besu 26.8.0 occasionally answered `eth_getBalance` at `latest` with `null` (4 times in about 8 h of 2 s blocks), which stopped four runs on 2026-11-01. In the same periods Besu's own txpool logged failures to read sender balances at the chain head, so the fault is node-side; cause inside Besu not established (probe: `research-net/probe-null-reads.mjs`). In the five reruns the retry absorbed one such null (R0-A2). A 60-minute probe on the idle chain (3,602 reads) saw none, which is too few reads to rule the fault out. Since then the rpc backend retries such reads with backoff and reports every occurrence per run (`timing.rpc`); a CI test injects nulls to keep this path working. | Mitigated |
| E14 | Runs can fail for infrastructure reasons. Examples are null reads (E13) and Node.js v22.23.4 crashing at start-up, before any output: once with a V8 fatal error (2026-11-01, rpc backend) and once with `SIGSEGV` (2026-11-04, Hardhat backend). That makes 2 native crashes in 100 run starts. The rpc backend loads no native modules, so the crashes come from below the simulator (Node.js/V8 or the host). Runs now start with `--report-on-fatalerror`, so a report lands in the run's folder. A failed run is rerun with identical parameters and both attempts are reported. Failed runs are never dropped silently, because dropping them could bias which outcomes are reported. | Open |
| E15 | Transactions that never become payable (E8) stay in Besu's txpool after their run ends; the layered pool drops old transactions only when its memory limit is reached. Later runs therefore start with a non-empty pool (988 transactions after the first 2026-11-01 campaign; after a node restart, 0 → 137 → 279, all from R0 runs). Runs use fresh accounts, so nonces do not collide, but pool limits are shared. Mitigation: restart the nodes before each campaign, and every run records the pool size at start and end (`timing.txpool`). | Mitigated |

## 4. Process disclosures

| ID | Disclosure |
|---|---|
| P1 | Design, code and draft text in this repository were produced with AI assistance (Claude, Anthropic). The author reviews, runs and verifies all results; venue-specific AI-use disclosures are written from the contribution log. |
| P2 | Funded test accounts use keys derived from public labels; they exist only on isolated test networks. |
