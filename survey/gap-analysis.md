# Gap analysis: where Intent-Bound Signing sits (draft 1.2, 2026-11-15)

Draft 1.2 adds search round 2 (backward snowballing from seven papers, venue and topic searches, vendor
documentation). **It withdraws one claim of draft 1.1:** vendor callback hooks (Fireblocks, BitGo, Cobo)
already place a machine check, in the customer's own trust domain, in front of a custodian's signer. O2 and
the C1 row are rewritten accordingly. Draft 1.1 added six full-text readings (see `notes/`).

Built from the 74 verified items in `matrix.csv` (30 peer-reviewed papers, 15 preprints, 11 standards,
18 grey-literature items). The search is not finished (see "Threats to validity"), so every "no prior work"
statement below means "none among the items surveyed so far" and is re-tested after each search round.

## 1. Coverage so far

| Code | Category | Items (primary or secondary) |
|---|---|---|
| T1 | Incident studies | 14 |
| T2 | Key management, MPC | 11 |
| T3 | Authorization policy | 20 |
| T4 | Intent and display integrity | 15 |
| T5 | Account abstraction, EIP-7702 | 14 |
| T6 | Monitoring, detection, response | 10 |
| T7 | Bridges | 5 |
| T8 | Evaluation infrastructure, mempool | 6 |
| T9 | Endpoint and supply chain | 6 |
| T10 | Standards and frameworks | 2 |

Thin areas: T10 (standards) and T9 (endpoint/supply chain) still have few peer-reviewed items. T3 grew
most in round 2, mostly from vendor documentation and draft standards, which are claims rather than results.

## 2. Observations

**O1. Each defense protects one layer and trusts the layer before it.**

| Layer | What it protects | Representative items | What it still trusts |
|---|---|---|---|
| Key | The key cannot be stolen whole | aumasson2020tecdsa, makriyannis2023mpcattacks, verichains2023tsshock | Whatever request the orchestration sends to the signers |
| Device display | The signer sees readable data | erc7730, erc8176, ef2026clearsigning, almutairi2019keepkey, ivanov2021ethclipper | A human comparing the display with their own belief; descriptor authors and attesters |
| Pre-sign simulation or attestation | The predicted outcome looks safe | blockaid2024vtx, wang2026simphishing, zengo2023redpill | Simulation state equals execution state; a risk model, not an intent |
| Signing-path callback | A customer-run service approves each request before the custodian's signer acts | fireblocks2026cosignercallback, bitgo2026policies, cobo2026triplea | Whatever logic the customer writes, and that the callback does not share credentials with the systems it checks |
| Account or contract policy | Only allowlisted calls execute | gnosisguild2024roles, erc7579, bellare2014pbs, badertscher2021pcs, diangelo2021walletcontracts | Policy updates, which are themselves signed transactions |
| Protocol monitoring | Abnormal protocol activity is flagged or paused | meng2026houston, forta2024firewall, erc7265 | Protocol contracts or a sequencer the operator controls |
| Bridge accounting | Outflows match inflows | liu2024montecrypto, augusto2024xchainwatcher | A source-chain record of every deposit |
| Process standards | Procedures exist and are audited | ccss2024v9, eu2018rtssca | People following them |

The incidents in our catalog (Bybit, Radiant, WazirX, DMM, Bitget 2026, Binance 2026) succeeded at the
request layer: valid keys signed a request that did not match what the organisation intended. NCC Group's
Bybit analysis (nccgroup2025bybit) reports that the Safe gateway did not check that a proposal's hash
matched its signature until after the attack.

**O2. Independent intent checking exists as a hook; what it checks is unspecified.** *Corrected in draft 1.2.*

Draft 1.1 said no surveyed item records intent in a separate trust domain, checks the signing request against it
by machine before signing, and applies this to a custodian's outbound transfers. That is not true of industry
practice:

- Fireblocks' API Co-signer sends every signing or approval request to a customer-hosted Callback Handler and
  joins MPC signing only if the handler approves (fireblocks2026cosignercallback).
- BitGo's webhook policy rule sends each triggering transaction to the customer's server and denies or
  escalates on any non-200 response (bitgo2026policies).
- Cobo argues, after the Triple-A incident, for "independent intent verification" by callbacks run in the
  client's own trust domain, fail-closed (cobo2026triplea).
- Outside custody, AP2 has user-signed open Mandates checked by machine against agent-signed closed ones before
  payment credentials are released (ap2v02).

So the *placement* of C1 is established. What none of these specifies or evaluates in public:

1. what the callback compares the request against, and how intents are authenticated;
2. what it decodes (EIP-7702 authorizations, DELEGATECALL, upgrades);
3. how it composes with budgets and containment, and what loss is bounded when the callback or the intent
   source is itself compromised.

Cobo itself notes that the check is worthless when the callback shares credentials with the systems it
checks. These three are where IBS can contribute: a specified intent record and matching rule, proofs, and
measurements. The paper must cite these products as the deployed form of C1's placement.

Other items that do part of what C1 does:

- liu2024montecrypto: the source-chain deposit is an independent record, but only bridges have one.
  Its report-then-execute design (a reporter must vouch before the bridge executes) is the closest
  academic architecture to C1 that we found.
- eu2018rtssca (PSD2 dynamic linking): the authorization is tied to amount and payee, but the reference is
  what the payer was shown.
- blockaid2024vtx: a second party attests the request before signing, but it attests risk, not intent.
- pcaversaccio2025safehashes: independent only when the signer types the intended transaction by hand.
- ccss2024v9: has a "spend verification" control; its text is not yet read (pending).
- zhang2023sokbridges: message verification in bridges.
- homoliak2020smartotps: a second factor from a separate device, verified on-chain (self-custody).
- yu2026pass: a machine-checked entitlement rule at a TEE signer (provenance, not intent).
- erc8273: a separate attestor gates each agent action on-chain (draft; attestor logic unspecified).

**O3. Post-sign containment exists for protocols and bridges, rarely for custodians.** HOUSTON, Forta,
ERC-7265, Monte Crypto, Zodiac's delay module and Bitcoin covenant vaults all detect, delay or block
outflows. The two closest to custody are covenant vaults (moeser2016covenants: a public delay plus a
recovery key, but it needs a Bitcoin consensus change and delays every spend) and the Monte Crypto
balance invariant (bridges only). We found no item that reconciles a custodian's landed withdrawals
against an intent ledger and then contains automatically; vendors describe manual, multi-person emergency
stops (cobo2026triplea). The full texts sharpen this:

- Monte Crypto explicitly puts out of scope attacks that move funds straight from a wallet with a
  compromised key (no withdrawal step), which is the custodial case (notes/liu2024montecrypto.md).
- HOUSTON drops plain ETH transfers and standard token calls before modelling, and a custodial drain
  consists of exactly those (notes/meng2026houston.md).
- The wallet SoK lists 29 defence methods, of which only one is a response method
  (notes/erinle2025sokwallets.md).
- Where a response window exists, people rarely use it: 87 of 183 DeFi victims had a pause, 51 used it
  within 48 hours and one within an hour (notes/zhou2023sokdefi.md). That is the case for *autonomous*
  containment.

**O4. Evaluations seldom run on a real client, and none compares execution backends.** Most items are
incident analyses or replays. HOUSTON reports a 20-day live run on 20 protocols plus a 3-week rerun;
Monte Crypto a 10-month live audit of Wormhole and a report-then-execute prototype on testnets.
DETER, mpfuzz and Fluffy run real clients, but study denial of service or consensus bugs, not
loss. No surveyed defense reports results on two backends. Our Hardhat vs Besu difference (limitation E8:
Besu queued underfunded withdrawals and released them later) is therefore a methodological point in its
own right; wang2024mpfuzz and li2021deter are the closest prior work.

**O5. EIP-7702 adds a request type that existing controls do not model.** huang2026darkside and
qi2025eip7702phishing measure consumer abuse at scale; qian2026delegproof gives a machine-checked model.
None addresses a custodian whose orchestration asks its signer for a delegation (our attacker A3).

**O6. Budget counting rules are rarely stated, and where stated they differ.** Round 2 checked when an amount
counts against a limit:

| Item | When an amount counts | Window |
|---|---|---|
| privy2026stateful | At signing (raw-signing flow) | Rolling |
| chen2026bts (ePrint 2026/2176) | At signing, per epoch | Epoch |
| ap2v02 | At approval of a closed Payment Mandate; an agent must not present a new open Mandate before a rejection receipt for the previous one | Lifetime budget |
| erc7715 (via ERC-7710) | At execution, by the on-chain delegation manager | Per permission (periodic in some wallets) |
| levchin2014limit (PayPal, 1999 priority) | Requested or initiated but not yet cleared transfers count | Account limit |
| fireblocks TAP, bitgo2026policies, dfns2026policyengine | Not stated | Time window |

Counting at execution (on-chain) cannot be hoarded around but acts only at execution. Counting at signing
over a *rolling* window leaks when signatures stay valid after their window passes (our A10). AP2 avoids
this by a lifetime budget and one outstanding approval at a time; Ethereum has no transaction expiry
(eip5081 is stagnant). See `docs/PRIOR_ART_HOARDING_FIX.md`.

## 3. Mapping to IBS controls

| Control | Closest prior art | What is different in IBS | What our papers must show |
|---|---|---|---|
| C1 intent binding | **Placement already deployed:** fireblocks2026cosignercallback, bitgo2026policies, cobo2026triplea; ap2v02 (commerce). Partial: liu2024montecrypto (report-then-execute), eu2018rtssca, erc7730, blockaid2024vtx, pcaversaccio2025safehashes | A specified intent record and matching rule (what the callback must check), authenticated intents, and its composition with C2-C4 | That the specified check catches request manipulation that passes display checks; false-reject rate on benign traffic; what is lost when the intent source or callback is compromised (T3, A4) |
| C2 deny-by-default semantic policy | gnosisguild2024roles, erc7579 hooks, bellare2014pbs, badertscher2021pcs, CCSS aspect 1.05 | Policy at the signer over decoded semantics, including 7702 authorizations, delegatecall and upgrades | Blocks delegation and upgrade classes (A3, Bybit-type) at low benign cost; policy-update path protected |
| C3 exposure budgets | Vendor velocity limits (Fireblocks TAP, bitgo2026policies, dfns2026policyengine), privy2026stateful, chen2026bts, ap2v02, erc7715, erc7265, moeser2016covenants, wallet daily limits (diangelo2021walletcontracts), Zodiac allowances | Not the budget itself, which is standard: the counting rule (signature counts until executed plus T) and the bound it gives (B, against B + Wνb without it) | Bounded loss versus throughput cost; the hoarding result (sweeps, TLC) |
| C4 watcher and containment | meng2026houston, forta2024firewall, augusto2024xchainwatcher, liu2024montecrypto, dagher2015provisions | Reconciles landed transfers with the intent ledger in real time and contains automatically (freeze signer, revoke delegation) | Detection and containment time on a real client (Besu runs so far: R2 2.03 s; R3 alert 0.10 s, contain 2.05 s) and the loss bound that follows |

## 4. Terminology

"Intent" has at least three meanings in this literature, and the papers must say which one is meant:

1. A solver-filled order (erc7683; EIP-7521, now moved to the ERC track): the user states a goal and a
   third party chooses how to execute it.
2. A human-readable description of a call (erc7730's `intent` and `interpolatedIntent` fields).
3. In IBS: an operation record authored in a trust domain independent of the signing orchestration,
   against which a signing request is checked.

## 5. Threats to validity

- **Search coverage.** About 100 logged web queries plus a patent search, English only. Backward snowballing
  done from seven papers (673 references screened). Forward snowballing was only approximated by topic
  searches for 2025-2026 work, because citation indexes (Google Scholar, Semantic Scholar, DBLP, Crossref)
  cannot be reached from the research workspace; it must be redone from a campus machine before submission.
  Still no fixed-string database search (IEEE Xplore, ACM DL, Scopus).
- **Vendor documentation.** Round 2 shows that the most relevant prior art for C1 and C3 is in vendor
  documentation, not papers. Documentation states features, not how they behave under attack, and changes
  without notice; every vendor claim is dated and marked grey.
- **Recency.** Items run to November 2026; preprints may have newer versions or venues.
- **Grey literature.** Vendor figures (e.g. Forta's recall) are claims, not results; they are marked grey and
  never used as evidence of effectiveness.
- **Extraction.** One author with AI assistance filled the matrix. A second, independent pass is needed
  before submission, and every reference is re-checked against its source.
- **Framing bias.** The `independent_intent` and `post_sign_containment` columns are our own lens and
  favour IBS's framing. Mitigation: publish the matrix and the column definitions, and state the
  strongest case for each competing layer in the paper.

## 6. Next steps

1. Forward snowballing and a fixed-string database search from a machine with library access; backward
   snowballing from zhang2023sokbridges (PDF not held).
2. Resolve `pending.md` (CCSS 1.05.8 text, Chainalysis primaries, Moore-Christin LNCS details, vendor
   counting rules).
3. Use erinle2025sokwallets' dataset and olushola2025exchangecrimes as second sources for the incident
   catalog cross-check.
4. Turn sections 2 and 3 into the related-work sections of Paper A and Paper B.
