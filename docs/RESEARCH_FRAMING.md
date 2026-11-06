# Intent-Bound Signing: research framing (v1, 2026-11-03)

One document that states what problem we solve, what exists, what we claim, how we will prove it, how we
test it, and what data and real-world work back it. Papers, the proposal and the dashboard all refer
back to this. Evidence is cited by repository path or by BibTeX key in `survey/references.bib`.

**Thesis.** The largest custody losses of 2024–2026 did not need stolen keys. Attackers controlled the
systems that *ask* the signer to sign, and the custodian's own signer produced valid signatures for
theft. A signature should be valid only if it matches an intent authenticated in a separate trust
domain. Spending should be capped so that any remaining failure has a bounded cost, and anything that
still leaves the wallet unexplained should trigger automatic containment. We call this Intent-Bound
Signing (IBS). We will prove what it guarantees and what it cannot. We will measure it on a simulator
and on a real Ethereum client, and test it against every incident of $10M or more in our scope.

---

## 1. The problem and its challenges

| # | Challenge | Evidence |
|---|---|---|
| CH1 | **Valid signatures, wrong intent.** The dominant large-loss pattern is a legitimate signer signing an attacker's request: orchestration compromise, UI or payload tampering, blind signing. | 12 verified catalog incidents, $9.93B: Binance 2026 ($6.36B), Bybit ($1.46B), Bitget ($387.5M), DMM ($305M), Drift ($285M), WazirX ($234.9M) and others (`catalog/incidents.csv`). In 8 of 12 the authorization type is signing-request manipulation, blind signing or account takeover; the other 4 are key theft or validator-key compromise. |
| CH2 | **Every layer trusts the one before it.** MPC protects the key, clear signing protects the display, contract policy protects execution; none checks *why* a request exists. | Gap analysis O1 (`survey/gap-analysis.md`); the NCC Group Bybit analysis reports that the Safe gateway did not check proposal–signature consistency until after the attack (`nccgroup2025bybit`). |
| CH3 | **Humans are the last check, and they fail.** | A 10-person study: most participants caught some, but not all, address substitutions (`almutairi2019keepkey`). Look-alike addresses defeat partial checking (`ivanov2021ethclipper`). Bybit signers approved what a tampered UI showed. |
| CH4 | **New signable objects grant lasting control.** An EIP-7702 authorization hands over the account with one signature. | Over 63% of 3.66M authorizations are linked to malicious EOA-targeted attacks (`huang2026darkside`); 10 machine-checked attack patterns (`qian2026delegproof`). |
| CH5 | **Attacks are faster than people.** | 56% of DeFi attacks were not atomic, leaving a response window. Yet of the 87 victims with a pause mechanism, 51 used it within 48 h and only one within an hour (`zhou2023sokdefi`). One-block drains leave no window at all (our R2-A2: contained in 2.05 s, $2.21B lost). |
| CH6 | **Defences stop at the signature.** | Of 29 wallet defence methods, 7 are remedial and only 1 is a response method (`erinle2025sokwallets`). Monitoring tools target protocols (`meng2026houston`, `forta2024firewall`) and drop the plain transfers custodial drains consist of. |
| CH7 | **Controls must not break withdrawals.** Hot wallets serve thousands of withdrawals; a control that blocks them is not deployable. | Budgets alone let an attacker exhaust them: R1 blocks 458 of 727 legitimate withdrawals under attack (`testbed/results/2026-10-30/`). |
| CH8 | **There is no public testbed or reliable dataset.** | No public custodial-pipeline testbed exists. Simulator and client disagree on mempool semantics (E8). Aggregator labels contradict primary sources for Binance 2026, Bitget 2026 and Binance 2019 (`catalog/`). |

## 2. Current solutions and where they stop

| Family | Examples | What it guarantees | What it assumes or misses |
|---|---|---|---|
| Key protection | HSM, MPC/threshold ECDSA (`aumasson2020tecdsa`) | No single party holds the key | Signs any request the orchestration sends; MPC implementations have their own key-extraction flaws (`makriyannis2023mpcattacks`, `verichains2023tsshock`) |
| Multisig + clear signing | Safe, ERC-7730 (`erc7730`) | Signers see readable data | A human compares the display with their belief; ERC-7730 itself lists front-end compromise and registry poisoning |
| Out-of-band hash check | safe-tx-hashes (`pcaversaccio2025safehashes`) | Signed hash equals recomputed hash | Independent only if the signer re-enters the intended transaction by hand |
| Pre-sign simulation or attestation | Blockaid VTX (`blockaid2024vtx`), wallet simulation | Predicted outcome looks safe | A risk model, not an intent; simulation can be gamed (`wang2026simphishing`) |
| On-chain policy | Zodiac Roles (`gnosisguild2024roles`), ERC-7579 hooks, wallet limits | Only allowlisted calls execute | Policy updates are themselves signed requests (the Bybit path) |
| Cryptographic policy | Policy-based / policy-compliant signatures (`bellare2014pbs`, `badertscher2021pcs`) | Key can only sign policy-compliant messages | Static policy, non-standard verification; no per-operation intent |
| Rate limits and vaults | ERC-7265 (`erc7265`), covenant vaults (`moeser2016covenants`) | Bounded or delayed outflow | Protocol-side or Bitcoin-only; no intent |
| Monitoring and response | HOUSTON, Forta, XChainWatcher | Fast detection of anomalous protocol transactions | Protocol scope; cannot stop a drain in the attack block |
| Accounting and report-then-execute | Count of Monte Crypto (`liu2024montecrypto`) | Outflows match inflows; an independent reporter vouches before execution | Bridges only. The authors explicitly exclude direct drains from a wallet, which is the custodial case |
| Regulation | PSD2 dynamic linking (`eu2018rtssca`), CCSS (`ccss2024v9`) | Authorization tied to amount and payee; audited procedures | Reference is what the payer saw; process, not machine-enforced |

**What is genuinely close, so we must be precise.** Report-then-execute, PSD2 dynamic linking and
attestation services each contain one piece of IBS. Our claim is not any single piece. It is this
combination, with stated proofs, real-client evidence and incident-level evaluation:

1. The intent comes from a separate trust domain.
2. It is checked by machine at the custodian's signer, before signing.
3. It sits under a deny-by-default semantic policy that covers EIP-7702 and upgrades.
4. Exposure budgets bound the cost when a component fails.
5. Autonomous containment acts on whatever still leaves the wallet unexplained.

Industry policy engines are a likely reviewer objection ("this is a policy engine"). We still need
verified vendor documentation to state what they can and cannot express; this is pending.

## 3. Scope

**In scope.**
- U1: exchange and custodian hot and warm wallets on EVM chains.
- U3: privileged signing paths (admin and multisig keys used through a compromised pipeline).
- U2 bridge validator signing: partly, through deposit evidence as the intent (attacker A6, planned).
- Attacks: orchestration compromise, request or payload manipulation, blind signing, EIP-7702
  delegation abuse, atomic drains, compromise of the intent authority.

**Out of scope** (each recorded in `docs/SCOPE_AND_LIMITATIONS.md` with reasons):
- Smart-contract bugs (S2).
- Insider collusion with the signer's operator (S3).
- Laundering and recovery (S4).
- *Preventing* key exfiltration: IBS detects and contains it but cannot stop a stolen key used directly.
- Non-EVM legs of incidents (E1).
- Consumer wallet phishing, except as an attacker technique.

**Research questions.**
- **RQ1 (prevention).** Does binding every signature to an independently authenticated intent prevent
  signing-path compromise, at an acceptable cost to legitimate withdrawals?
- **RQ2 (bounds).** What losses remain when parts fail (intent authority compromised, signer unfrozen
  early, watcher delayed), and are these bounds tight?
- **RQ3 (speed and limits).** How fast is autonomous containment on a real client, and what can it
  provably not stop?
- **RQ4 (validity).** Do simulator results transfer to a real client, and which client semantics change
  outcomes?
- **RQ5 (incidents).** For each in-scope incident of $10M or more, which control would have stopped or
  bounded it, and which would not?

**Claims we will not make.** That IBS stops key theft. That our losses are predictions of real
incidents (they are counterfactual replays). That results hold for other clients until tested.

## 4. Threat model approach

**Trust domains (system model).**

| Component | Role | Trust |
|---|---|---|
| Orchestration O | Builds and submits signing requests (withdrawal engine, treasury automation) | **Untrusted** (assumed compromisable) |
| Signer S | Holds hot keys (HSM/MPC/TEE); runs the IBS decision rule | Trusted to execute its code; keys never leave it |
| Intent authority IA | Issues signed intents for user-authenticated withdrawals and quorum-approved treasury operations | Separate domain; may be compromised in attacker A4 |
| Watcher V | Reads the chain through its own node; reconciles outflows against the intent ledger | Independent read path; may be delayed |
| Chain | Orders and executes transactions | Live and correct; mempool semantics vary by client (E8) |

**Adversary classes** (capabilities, not actors):

| Class | Capability | Implemented as |
|---|---|---|
| Orchestration control | Submit any request to S at any time; read all internal state; choose timing | A1 Binance-paced replay, A2 atomic blitz, A3 policy-aware plain transfers |
| Intent-authority compromise | Mint valid intents to attacker addresses | A4 |
| Display or payload tampering at human signers | Show one payload, sign another | A5 blind-signing multisig (planned; Bybit/WazirX/Radiant) |
| Stolen key used directly | Sign without S | A6 bridge validator key (planned; Ronin/Harmony); detection only |
| Below-threshold drip | Stay under budgets for a long time | A8 (planned) |
| Mempool-aware | Exploit client queueing: pre-queue transfers that become valid on replenishment; replace stalled nonces | A9 and A3r (planned; motivated by E8) |
| Consumer-style 7702 phishing | Trick a human into signing a delegation | A7 (planned) |

**How the threat model is validated.** Every catalog incident is coded with its authorization type and
access path. The model must cover every in-scope incident, and coverage is reported (RQ5). An incident
that fits no adversary class forces a change to the model, not an exclusion.

## 5. The proposal: IBS as a formal model

**Objects.**
- Treasury wallets $\mathcal{W}$ and assets $\mathcal{A}$.
- An intent $i = (\mathit{id}, w, a, \mathit{to}, v, \chi)$: unique id, wallet, asset, recipient,
  amount, chain id. It is issued by IA with signature $\sigma_i = \mathsf{Sig}_{sk_{IA}}(H(i))$ and
  appended to the ledger $L$.
- A request $r$ with kind $\kappa(r)$ (transaction or EIP-7702 authorization), payload, and nonce $n(r)$.
- A decoder $\delta(r) \in \{\mathsf{Transfer}(w,a,\mathit{to},v)\} \cup \{\bot\}$.
- Signer state: frozen flag $f$, used-intent set $U$, and the signed-value history used for budgets.

**Decision rule (controls C1–C3).** S signs $r$ at block $k$ if and only if all of the following hold:

1. $\neg f$.
2. $\kappa(r) = \mathsf{tx}$ (all authorizations are denied, except break-glass revocation to the zero
   address).
3. $\delta(r) = \mathsf{Transfer}(w,a,\mathit{to},v) \neq \bot$ (deny by default).
4. $n(r) \in [n_w, n_w + \nu)$ (nonce window).
5. $\mathsf{usd}(a,v) \le b$ (per-transaction cap; above it, escalate to people).
6. $\sum_{\text{signed in } (k-T,k]} \mathsf{usd} + \mathsf{usd}(a,v) \le B$ (sliding-window budget).
7. There is an $i \in L$ such that $\mathsf{Vrfy}(pk_{IA}, H(i), \sigma_i)$, $\mathit{id}(i) \notin U$,
   $\chi(i) = \chi$, and $(w(i), a(i), \mathit{to}(i), v(i)) = (w, a, \mathit{to}, v)$. On signing,
   $U \leftarrow U \cup \{\mathit{id}(i)\}$.

Configurations: R0 signs on request; R1 = C2+C3 (rules 1–6); R2 = C4 only; R3 = C2+C3+C4; R4 = all seven
rules plus C4.

**Watcher and containment (C4).** At each block $k$, V matches every outflow from $\mathcal{W}$ to an
unconsumed intent. It raises an alarm if any of these holds:
- an outflow has no match;
- a treasury account has code (a delegation designator);
- S reports a refused request (budget breach, authorization request, missing or mismatched intent).
  The tiered variant R4t raises only an alert, without freezing, for missing intents and
  authorization requests.

On an alarm at block $k$: $f \leftarrow 1$ and replenishment halts, effective from block $k+1$.

**Assumptions** (each stated in the papers, each tested or bounded):
- **A-sig.** The IA signature scheme is EUF-CMA secure and $sk_{IA}$ is not in the attacker's hands
  (dropped for A4).
- **A-key.** Hot keys never leave S.
- **A-dec (decoder soundness).** If $\delta(r) = \mathsf{Transfer}(w,a,\mathit{to},v)$, executing $r$
  changes the treasury's holdings by exactly $-v$ of $a$, plus fees. This holds for native transfers and
  for `transfer` on vetted token contracts, which is why everything else is denied.
- **A-ia.** IA authenticates the *user* (e.g. a passkey on the user's device) or a treasury quorum, and
  shares no infrastructure with O.

## 6. Security properties and how we prove them

| ID | Property | Holds under | Proof approach | Empirical check (seed 7, horizon 1,200) |
|---|---|---|---|---|
| T1 | **Intent soundness.** Every transfer S signs matches, one-to-one, a distinct IA-issued intent with identical fields. | A-sig, A-key, A-dec | Reduction: a signed transfer without a matching fresh intent yields an IA forgery (contradicts EUF-CMA), or reuses an id (contradicts $U$). Equality of fields plus A-dec gives the effect. | R4 vs A1–A3: USD 0 loss on Hardhat and Besu; 6 no-intent denials in R4-A3 |
| T2 | **No delegation.** No treasury account ever carries delegated code. | A-key, rule 2 | Induction over blocks: a 7702 designator needs an authorization signed by $w$'s key; only S holds it, and S signs only zero-address revocations. | Delegated blocks = 0 in R1, R3, R4 (R0-A1/A2: 1,149) |
| T3 | **Exposure bound.** Signed outflow over any horizon $H$ satisfies $\mathit{Loss} \le B\lceil H/T\rceil$, even if IA is compromised. When every attacker outflow raises an alarm (C4 reconciles against an intact IA) and there is no unfreeze, $\mathit{Loss} \le B + W\nu b$ for $W$ hot wallets. *Revised 2026-11-05:* the earlier claim $\mathit{Loss} \le B$ ignored signatures held unsent across a window (attacker A10). Charging outstanding signatures to the budget until they execute would restore $\mathit{Loss} \le B$ (design option, not yet evaluated). | Rules 4–6; alarm triggers C4 | Any $T$ consecutive blocks carry at most $B$ of signatures (rule 6); partition $[0,H]$ into $\lceil H/T\rceil$ windows. Containment acts at the end of the first block with an attacker outflow. By then the attacker has spent at most $B$ signed in the current window, plus signatures held from earlier windows. Those are at most $\nu$ per wallet, since the nonce window starts at the pending nonce and held signatures do not advance it. | $B$ = USD 25M, $T$ = 300, $H$ = 1,200 ⇒ USD 100M: R1 USD 95.8M (all attackers, both backends). Single-incident: R3-A3, R4-A4, R4t-A4 all USD 24.0M. A10 (hoarding) on Hardhat: R3-A10 USD 22.0M, of which USD 4.0M was signed in an earlier window; this is below USD 25M only because legitimate withdrawals used about USD 7M of the fresh window, and the revised bound is USD 25M + 3·4·USD 1M = USD 37M. With early unfreeze: R3p-A1/A3 and R4p-A4 USD 97.8–98.8M ≤ USD 100M |
| T4 | **Containment latency.** An outflow not authorized through S is detected at the block it is included in, and S is frozen from the next block. | Watcher liveness, independent node | Direct from the watcher loop; latency = one block + processing. | Besu, 2 s blocks: R2 detect/contain 2.04/2.05 s; R3-A3, R4-A3 alert ≤ 0.06 s, contain ≤ 2.00 s |
| T5 | **Impossibility (negative result).** No detector that reacts to included blocks can bound the loss of a drain executed atomically in one block. | Any post-inclusion detector | Causality: the detector's first observation is the block that already contains the drain. Hence pre-sign controls (T1, T2) are *necessary* for atomic attacks. | R2-A2, R2-A3: contained in one block, USD 2,209.7M lost; R3/R4 vs A1/A2: USD 0 |
| T6 | **Liveness.** With no attack, every benign request whose intent is valid and which respects $b$ and $B$ is signed. | IA available | Direct from the decision rule. | R4-benign: 726 of the 727 requests made while withdrawals were open were signed; 1 escalated (above $b$ = USD 1M) |
| T7 | **Budget non-exhaustion.** Requests without a valid intent never consume budget, so an attacker without IA cannot deny service through the budget. | Rule order: budget is charged only on signing | Only signed transfers enter the window sum. | R4t vs A1–A3: 726 legitimate withdrawals completed, USD 0 loss. R1 (no C1): only 268 completed, 458 blocked |

**Mechanized proofs (plan).**
- **TLA+ (TLC).** The signer, watcher and containment state machine with budgets, held signatures and freeze
  (`formal/IBS.tla`). It checks T1–T4, T6 and T7 over bounded horizons, plus two expected failures: T5's one-block
  drain without pre-signing controls, and the hoarding counterexample to the old $\mathit{Loss} \le B$ claim.
  **Checked 2026-11-05:** all 8 configurations gave the expected outcome, up to 7.8 million distinct states, at
  small sizes (B = 4, T = 2, cap 2, ν = 2, 4 blocks). Extending T3 to all sizes (Apalache, TLAPS or Lean) remains.
- **Tamarin.** Intent binding, replay and cross-chain replay (T1), alongside EIP-7702 authorization
  semantics, following the method of `qian2026delegproof`.
- Proof sketches go in Paper B; the models go in the repository with CI.

**The bounds are tested, not just asserted.** Observed losses sit 1–5% below each bound (T3), so the bounds
are tight for the scripted attackers. Adaptive attackers test them further. A10 (hoarding) already forced a
correction: the single-incident bound is $B + W\nu b$, not $B$. A8 (drip) and A9 (mempool-aware) come next.

## 7. Experimental evaluation

**Status (2026-11-03).**

| Item | State | Where |
|---|---|---|
| Simulator: 33 runs (R0–R4, R2p/R3p/R4p, R4t × A1–A4 and benign), seed 7 | Done | `testbed/results/2026-10-30/` |
| Real client: Besu 26.8.0, 15 core runs, seed 7, full horizon | Done (15/15; 5 rerun) | `testbed/results/2026-11-01-besu-core15/` |
| Sim-to-real agreement | All 12 controlled runs match; 3 R0 baselines lower on Besu (E8) | same |
| Hardhat multi-seed (seeds 7–11, 75 runs) | Running | dashboard campaign `c20261104005121-77dab1` |
| Null-read probe, 6 h, REPEAT=20 | Running | `research-net/probe-null-reads.mjs` |

**Design going forward.**
- **Factors:**
  - configuration: R0–R4 plus variants;
  - attacker: A1–A4 now; A3r and A5–A9 next;
  - seed;
  - parameters $B$, $T$, $b$, $\nu$;
  - backend: Hardhat or Besu (a second client, e.g. Geth, if time allows).
- **Outcomes:**
  - loss by asset, and loss at first containment;
  - detection and containment step and seconds;
  - legitimate withdrawals sent, landed, blocked and escalated;
  - false alarms;
  - signer denials by reason;
  - step overruns, null reads, txpool size (validity checks).
- **Statistics:**
  - 10 seeds per cell on Hardhat and 5 on Besu. A paired Wilcoxon test on 5 pairs cannot give a two-sided p below 0.0625, and with 5 seeds the bootstrap CI of the median is just the observed range (`testbed/results/2026-11-04-hardhat-5seeds/`). Besu validates outcomes; it isn't used for contrasts;
  - medians with bootstrap 95% CIs (`testbed/tools/seed-summary.mjs`);
  - paired Wilcoxon signed-rank tests across seeds for configuration contrasts, alongside the per-seed values;
  - every R0 baseline reported as a [Besu, Hardhat] range until A3r removes the dependence.
- **Parameter study.** Sweep $B$, $T$ and $b$ to draw the loss vs availability frontier. Calibrate
  realistic values from real hot-wallet traffic (§8).
- **Validity rules (already enforced):**
  - provenance per run (commit, clean tree, simulator hash, client version);
  - failed runs rerun and both attempts reported (E14);
  - one campaign at a time on the chain (E12);
  - every limitation registered.

## 8. Data analysis

1. **Incident catalog** (`catalog/`).
   - **Scope:** every in-scope incident of $10M or more since 2014. 130 candidates from the
     DeFiLlama snapshot of 2026-10-31: 12 verified, 9 excluded with reasons, 109 pending.
   - **Coding per incident:** universe, access path, authorization type, detection, response; which IBS
     controls apply; and a predicted outcome (prevented / bounded to ≤ $B$ / detected but not prevented
     / out of scope), with a reason.
   - **Second sources:** the `erinle2025sokwallets` dataset and `olushola2025exchangecrimes`.
   - **Output:** coverage tables for RQ5.
2. **Aggregator reliability.** Disagreement between aggregator labels and primary sources is itself a
   finding: three disagreements found so far (Binance 2026, Bitget 2026, Binance 2019).
3. **Real hot-wallet traffic (planned).** Use public on-chain data from labelled exchange hot wallets to:
   - fit withdrawal size and arrival distributions, replacing the synthetic traffic (E4);
   - replay that traffic through the budget rules, to measure how often a given $(B, T, b)$ would have
     escalated or blocked legitimate flow.

   This yields realistic parameters and a false-positive rate from real data. It uses no private data.
4. **Sim-to-real analysis.**
   - Report the agreement rate per configuration.
   - Explain every disagreement causally from per-step traces (done for all R0 runs).
   - Classify client semantics that matter: admission of overdraft and latent-overdraft transactions,
     per-sender limits, state reads at the head (E13).
5. **Forensic reconstruction of Binance 2026** (Paper A): an on-chain timeline from primary data, with
   each step mapped to the adversary model and to the controls that would have intervened.

## 9. Real-world work

- **Real client now.** All campaigns run on a 4-validator Besu QBFT network (chain 252701) on lab
  hardware, isolated from the production chain 252501.
- **Upstream contribution.** If the probe reproduces the null state reads, file a minimal report with
  Besu (E13).
- **Prototype #11 (testnet only, no real funds).**
  - An exchange-like custody service: a signer service with the IBS decision rule as a sidecar to an
    HSM/MPC signer.
  - An intent authority bound to user passkeys (dynamic linking, crypto-native).
  - A watcher with containment.
  - Boundary: DIDLab is not an exchange or custodian (`claude/DIDLab_Addendum_B_IBS_Custody_Prototype.md`).
- **Integration questions the prototype must answer:**
  - intent-check latency per signature;
  - operational intents for hot/cold sweeps and replenishment (quorum-issued);
  - IA availability as a liveness dependency;
  - multi-chain intents.
- **Open science.** A public repository with a one-command quick start, CI, pinned versions, the
  limitations register, the incident dataset with sources, and the reading notes.

## 10. Outputs

| Output | Content | Built from |
|---|---|---|
| Paper A | Forensic reconstruction of Binance 2026 plus incident analysis (RQ5) | §4 coding, §8 items 1, 2 and 5 |
| Paper B | IBS: model, T1–T7 with proofs, simulator and Besu evaluation (RQ1–RQ3) | §5–§7 |
| Paper C | Sim-to-real for blockchain security experiments: client semantics change outcomes (RQ4) | §7, §8 item 4, E8, E13 |
| SoK (later, peer-reviewed venue first) | Defence layers against signing-path compromise | `survey/` |
| NSF SaTC proposal (Jan 25, 2027) | Problem (§1–§2), approach (§4–§6), preliminary results (§7), broader impacts and prototype (§9) | All of the above |

## 11. Critical risks and responses

| Risk | Response |
|---|---|
| Novelty challenged by report-then-execute, PSD2 or policy engines | State the five-part combination exactly (§2). Credit each source. Show what each lacks with a concrete incident (e.g. Bybit passes a policy engine whose own update path is compromised). |
| The intent authority becomes the new target | T3 bounds it: at most $B$ per window while the attacker stays under budget, and $\le B + W\nu b$ once a budget breach contains it (observed USD 24.0M at $B$ = USD 25M). A-ia requires user-device authentication and separate infrastructure; we report what happens when that fails (A4). |
| Internal transfers have no user intent | Model quorum-issued operational intents; evaluate sweeps and replenishment under A4-style compromise. |
| Budgets block real business | Parameter frontier from real traffic (§8 item 3); T7 shows C1 prevents attacker-driven exhaustion. |
| Results are artefacts of the simulator | Besu validation (done for seed 7); explain every disagreement; second client if possible. |
| Scripted attackers are weak | Adaptive attackers A3r, A8, A9; the T3 bound must hold for any attacker, so a violation would falsify it. |
| One coder, AI-assisted | Contribution log (P1); second coder for the catalog once students join; all references re-checked. |

## 12. Next steps (in order)

1. ~~Finish the Hardhat multi-seed campaign; report seed variance (closes E5).~~ Done 2026-11-04 at 10 seeds: the seed changes no outcome, and every configuration contrast is either significant (p ≈ 0.002) or identical at every seed (`testbed/results/2026-11-04-hardhat-10seeds/`). Start-up crashes are retried automatically; their cause is open (E14).
2. Read the probe result; decide on the upstream report.
3. Add attackers A3r and A9, then A5 and A8; run them on both backends. A3r and A9 were built on 2026-11-05: on Hardhat they equal A3, and Besu runs are pending.
4. Write the TLA+ model for T2, T3 and T6; draft the T1 reduction.
5. Verify the ≥$100M pending catalog candidates first; code all incidents for RQ5.
6. Public hot-wallet traffic: data pull, distribution fit, budget false-positive analysis.
7. Draft Paper B's model and evaluation sections from this document; proposal draft 2 after that.
