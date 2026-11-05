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
| E5 | **Hardhat: closed for the 15 core runs at 10 seeds (7–16).** No outcome changes with the seed. Losses stay within 0.10% of the median, except R1 (2.07%) and R3-A3 (4.16%), which take values one capped transfer apart. Zero-loss runs stay zero, alarms and containment steps are identical, and the T3 bounds hold at every seed. Every pair of configurations either differs at all 10 seeds in the same direction (exact Wilcoxon p ≈ 0.002) or is identical at every seed (`testbed/results/2026-11-04-hardhat-5seeds/`, `testbed/results/2026-11-04-hardhat-10seeds/`). **Besu still has seed 7 only** until the results freeze (CP4). | Mitigated |
| E6 | One step = one block. The incident timeline uses 12 s steps; the Besu research network produces 2 s blocks. Results in steps transfer; results in seconds are specific to the block period used. | Open |
| E7 | Real-client validation uses one client (Hyperledger Besu 26.8.0) on a private 4-validator QBFT network operated by one institution. It shows feasibility, overhead and client behaviour, not behaviour against real adversaries, real mempools or mainnet economics. | Open |
| E8 | **Simulator and client differ in mempool semantics.** Hardhat rejects underfunded transactions at submission; Besu queues them in nonce order and releases them when funds arrive, which changed the measured loss by 610 ETH in R0-A1 (`testbed/results/2026-10-31-backend-check/besu-R0-gap.md`) and, at full horizon, lowered all three unprotected baselines on Besu: R0-A1 and R0-A2 by $4.0M (0.12%), R0-A3 by $202.6M (8.4%), because a stalled nonce also held back the attacker's own transfers (`testbed/results/2026-11-01-besu-core15/`). All 12 runs with IBS controls (R1–R4) match Hardhat. Comparisons against the baseline use the lower (Besu) figure. The baseline is therefore reported as a range until an attacker that replaces stalled nonces (A3r) is added. Other clients (e.g. Geth) are untested. | Open |
| E9 | `benign.completed` counts withdrawals signed and sent, not executed. Results before 2026-10-31 report only this count; `benignLanded` (added 2026-10-31) reports execution. | Mitigated |
| E10 | Prices are fixed (ETH = $2,300; stablecoins = $1) for loss reporting. | Open |
| E11 | Hardhat runs before 2026-10-31 used a 230- or 1,200-step horizon; partial-horizon runs omit later incident events (steps 884 and 1,076). Each result records its horizon. | Open |
| E12 | Running several rpc campaigns at once on one chain shares block space and CPU and can change timing results. The dashboard runs one at a time by default and records, per run, how many runs were active when it started. | Open |
| E13 | Besu 26.8.0 occasionally answered `eth_getBalance` at `latest` with `null` (4 times in about 8 h of 2 s blocks), which stopped four runs on 2026-11-01. In the same periods Besu's own txpool logged failures to read sender balances at the chain head, so the fault is node-side; cause inside Besu not established (probe: `research-net/probe-null-reads.mjs`). In the five reruns the retry absorbed one such null (R0-A2). A 60-minute probe on the idle chain (3,602 reads) saw none, which was too few reads to rule the fault out. A 6-hour probe with 20 reads per address and tag per block (2026-11-04: 10,801 blocks, 432,040 reads, no simulator running) saw **113 nulls (0.026% of reads) and no errors**, so the fault reproduces without the simulator. Every null came 0–7 ms after the new block appeared, at the explicit block number as well as at `latest`, in 15 of 10,801 blocks. 13 of those 15 were imported at second :17 or :47 of the minute: something periodic on the machine widens a window in which Besu reports block N before N's state can be read (`research-net/results/2026-11-04-null-probe-6h.md`). That probe ran with turbo on (see E14); a turbo-off repeat comes before any upstream report. Since then the rpc backend retries such reads with backoff and reports every occurrence per run (`timing.rpc`); a CI test injects nulls to keep this path working. | Mitigated |
| E14 | Runs can fail for infrastructure reasons. **Null reads (E13).** **Start-up crashes of Node.js v22.23.4**, 5 in 185 run starts so far, always within 0.8 s and before any output, on a different cell each time:<br>• 3 × `SIGSEGV` (Hardhat backend);<br>• 1 × `SIGABRT` after glibc reported `free(): invalid pointer` (Hardhat backend);<br>• 1 × V8 fatal check (rpc backend, 2026-11-01).<br>These signatures point to native memory corruption during start-up, not to simulator logic. The kernel log has no entry.<br>**Cause: most likely the VM's host, not the software.** The host CPU is an Intel Core i9-13900K, a model with documented "Vmin shift" instability. The same starts on another machine (same Node, code and dependencies) crashed 0 times in 1,500, and 30 of 30 completed cells replayed there were identical, traces included (`testbed/results/2026-11-04-hardhat-10seeds/`). **Confirmed on 2026-11-04 (`testbed/results/2026-11-04-host-cpu/`):** with turbo on, the full simulator start failed 14 times in 300 on the VM: SIGSEGV, SIGABRT after `free(): invalid pointer`, and `TypeError: getWasmTableEntry(...) is not a function` thrown inside solc-js's WebAssembly. Node alone, viem and solc-js without compiling failed 0 times in 300 each. With turbo off on the host, the simulator start failed 0 times in 300 (Fisher exact p = 0.0001). The failures are wrong results inside a deterministic computation that occur only on this host at boost clocks, which identifies the CPU. Microcode is current (0x132), and the host logged no machine-check errors. **Consequences:** until the CPU is replaced, turbo stays off on the host. Hardhat results recorded with turbo on are accepted only after a replay on other hardware (`testbed/tools/replay-check.mjs`; 30 of 30 cells so far, all of them at the results freeze). Besu runs on the same host; whether the null reads (E13) share this cause is untested. **Rule:** a failed run is rerun with identical parameters and every attempt is reported. Failed runs are never dropped silently, because dropping them could bias which outcomes are reported. Since 2026-11-04 the dashboard does this automatically for start-up crashes (killed by a signal before any progress report): up to 2 retries, each attempt with its own record (`attempt`, `retryOf`, `retriedBy`) in the CSV export. Crashes after progress are never retried automatically. | Open |
| E15 | Transactions that never become payable (E8) stay in Besu's txpool after their run ends; the layered pool drops old transactions only when its memory limit is reached. Later runs therefore start with a non-empty pool (988 transactions after the first 2026-11-01 campaign; after a node restart, 0 → 137 → 279, all from R0 runs). Runs use fresh accounts, so nonces do not collide, but pool limits are shared. Mitigation: restart the nodes before each campaign, and every run records the pool size at start and end (`timing.txpool`). | Mitigated |

## 4. Process disclosures

| ID | Disclosure |
|---|---|
| P1 | Design, code and draft text in this repository were produced with AI assistance (Claude, Anthropic). The author reviews, runs and verifies all results; venue-specific AI-use disclosures are written from the contribution log. |
| P2 | Funded test accounts use keys derived from public labels; they exist only on isolated test networks. |
