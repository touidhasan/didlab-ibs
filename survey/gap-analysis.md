# Gap analysis: where Intent-Bound Signing sits (draft 1.1, 2026-11-01)

Draft 1.1 adds what six full-text readings showed (see `notes/`) and corrects one figure (HOUSTON's
live run is 20 days plus a 3-week rerun, not 40 days).

Built from the 50 verified items in `matrix.csv` (21 peer-reviewed papers, 12 preprints, 6 standards,
11 grey-literature items). The search is not finished (see "Threats to validity"), so every "no prior work"
statement below means "none among the items surveyed so far" and is re-tested after each search round.

## 1. Coverage so far

| Code | Category | Items (primary or secondary) |
|---|---|---|
| T1 | Incident studies | 11 |
| T2 | Key management, MPC | 5 |
| T3 | Authorization policy | 7 |
| T4 | Intent and display integrity | 9 |
| T5 | Account abstraction, EIP-7702 | 10 |
| T6 | Monitoring, detection, response | 8 |
| T7 | Bridges | 5 |
| T8 | Evaluation infrastructure, mempool | 5 |
| T9 | Endpoint and supply chain | 4 |
| T10 | Standards and frameworks | 2 |

Thin areas: T10 (standards) and T9 (endpoint/supply chain) have few peer-reviewed items; T2 is
deliberately shallow because IBS sits before the signer and does not change key management.

## 2. Observations

**O1. Each defense protects one layer and trusts the layer before it.**

| Layer | What it protects | Representative items | What it still trusts |
|---|---|---|---|
| Key | The key cannot be stolen whole | aumasson2020tecdsa, makriyannis2023mpcattacks, verichains2023tsshock | Whatever request the orchestration sends to the signers |
| Device display | The signer sees readable data | erc7730, almutairi2019keepkey, ivanov2021ethclipper | A human comparing the display with their own belief; descriptor registry |
| Pre-sign simulation or attestation | The predicted outcome looks safe | blockaid2024vtx, wang2026simphishing | Simulation state equals execution state; a risk model, not an intent |
| Account or contract policy | Only allowlisted calls execute | gnosisguild2024roles, erc7579, bellare2014pbs, badertscher2021pcs, diangelo2021walletcontracts | Policy updates, which are themselves signed transactions |
| Protocol monitoring | Abnormal protocol activity is flagged or paused | meng2026houston, forta2024firewall, erc7265 | Protocol contracts or a sequencer the operator controls |
| Bridge accounting | Outflows match inflows | liu2024montecrypto, augusto2024xchainwatcher | A source-chain record of every deposit |
| Process standards | Procedures exist and are audited | ccss2024v9, eu2018rtssca | People following them |

The incidents in our catalog (Bybit, Radiant, WazirX, DMM, Bitget 2026, Binance 2026) succeeded at the
request layer: valid keys signed a request that did not match what the organisation intended. NCC Group's
Bybit analysis (nccgroup2025bybit) reports that the Safe gateway did not check that a proposal's hash
matched its signature until after the attack.

**O2. Independent intent appears only in partial forms.** Six items do part of what C1 does:

- liu2024montecrypto: the source-chain deposit is an independent record, but only bridges have one.
  Its report-then-execute design (a reporter must vouch before the bridge executes) is the closest
  architecture to C1 that we found.
- eu2018rtssca (PSD2 dynamic linking): the authorization is tied to amount and payee, but the reference is
  what the payer was shown.
- blockaid2024vtx: a second party attests the request before signing, but it attests risk, not intent.
- pcaversaccio2025safehashes: independent only when the signer types the intended transaction by hand.
- ccss2024v9: has a "spend verification" control; its text is not yet read (pending).
- zhang2023sokbridges: message verification in bridges.

None of the surveyed items does all three of: (a) record the intent in a separate trust domain, (b) check the
signing request against it by machine before signing, (c) apply this to a custodian's outbound transfers.

**O3. Post-sign containment exists for protocols and bridges, rarely for custodians.** HOUSTON, Forta,
ERC-7265, Monte Crypto, Zodiac's delay module and Bitcoin covenant vaults all detect, delay or block
outflows. The two closest to custody are covenant vaults (moeser2016covenants: a public delay plus a
recovery key, but it needs a Bitcoin consensus change and delays every spend) and the Monte Crypto
balance invariant (bridges only). We found no item that reconciles a custodian's landed withdrawals
against an intent ledger and then contains automatically. The full texts sharpen this:

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

## 3. Mapping to IBS controls

| Control | Closest prior art | What is different in IBS | What our papers must show |
|---|---|---|---|
| C1 intent binding | liu2024montecrypto (report-then-execute), eu2018rtssca, erc7730 (its "future work" proposes binding frontends to verified manifests), blockaid2024vtx, pcaversaccio2025safehashes | Intent comes from a separate trust domain and is compared by machine, before signing | Catches request manipulation that passes display checks; false-reject rate on benign traffic |
| C2 deny-by-default semantic policy | gnosisguild2024roles, erc7579 hooks, bellare2014pbs, badertscher2021pcs, CCSS aspect 1.05 | Policy at the signer over decoded semantics, including 7702 authorizations, delegatecall and upgrades | Blocks delegation and upgrade classes (A3, Bybit-type) at low benign cost; policy-update path protected |
| C3 exposure budgets | erc7265, moeser2016covenants, wallet daily limits (diangelo2021walletcontracts), Zodiac allowances | Budget enforced at the custodian's signer per asset and time window, independent of any protocol | Bounded loss versus throughput cost |
| C4 watcher and containment | meng2026houston, forta2024firewall, augusto2024xchainwatcher, liu2024montecrypto, dagher2015provisions | Reconciles landed transfers with the intent ledger in real time and contains automatically (freeze signer, revoke delegation) | Detection and containment time on a real client (Besu runs so far: R2 2.03 s; R3 alert 0.10 s, contain 2.05 s) and the loss bound that follows |

## 4. Terminology

"Intent" has at least three meanings in this literature, and the papers must say which one is meant:

1. A solver-filled order (erc7683; EIP-7521, now moved to the ERC track): the user states a goal and a
   third party chooses how to execute it.
2. A human-readable description of a call (erc7730's `intent` and `interpolatedIntent` fields).
3. In IBS: an operation record authored in a trust domain independent of the signing orchestration,
   against which a signing request is checked.

## 5. Threats to validity

- **Search coverage.** About 45 logged queries so far, English only, no fixed-string database search (IEEE
  Xplore, ACM DL, DBLP, Scopus) and no snowballing yet. Venue-specific gaps likely (FC, AFT, ICBC, CCS
  workshops).
- **Recency.** Items run to October 2026; preprints may have newer versions or venues.
- **Grey literature.** Vendor figures (e.g. Forta's recall) are claims, not results; they are marked grey and
  never used as evidence of effectiveness.
- **Extraction.** One author with AI assistance filled the matrix. A second, independent pass is needed
  before submission, and every reference is re-checked against its source.
- **Framing bias.** The `independent_intent` and `post_sign_containment` columns are our own lens and
  favour IBS's framing. Mitigation: publish the matrix and the column definitions, and state the
  strongest case for each competing layer in the paper.

## 6. Next steps

1. Fixed-string database search, then backward and forward snowballing from erinle2025sokwallets,
   zhou2023sokdefi, zhang2023sokbridges and meng2026houston.
2. Resolve `pending.md` (CCSS 1.05.8 text, Chainalysis primaries, Moore-Christin LNCS details).
3. Use erinle2025sokwallets' dataset and olushola2025exchangecrimes as second sources for the incident
   catalog cross-check.
4. Turn sections 2 and 3 into the related-work sections of Paper A and Paper B.
