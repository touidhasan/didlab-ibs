# meng2026houston — HOUSTON (NDSS 2026)

Meng, Gritti, McLaughlin, Ruaro, Grishchenko, Kruegel, Vigna. *HOUSTON: Real-Time Anomaly Detection of
Attacks against Ethereum DeFi Protocols.* NDSS 2026. doi:10.14722/ndss.2026.241534.
Copy read: NDSS camera-ready PDF, 18 pages, sha256 `f15269b5…6e06` (held locally, not in git).
Page numbers below are PDF pages.

## What it is
An off-chain monitor that learns, per DeFi protocol, (a) which call sequences normally reach
sensitive operations and (b) likely invariants between function arguments and storage. Each new
transaction (pending or included) is replayed and checked against both; anomalies go to humans or
to automated responders (pause, white-hat front-running). No hand-written rules. (pp. 1–3)

## Numbers worth citing
- 115-incident benchmark over ~22M transactions; 94.8% true-positive rate, 0.16% false-positive
  rate. (pp. 1–2, 9)
- Live run: 20 protocols, all mainnet transactions 9–28 April 2024 (20 days); about half the 42.6M
  observed transactions were dropped up front as plain ETH transfers or calls to basic functions of
  well-known tokens. (p. 11)
- Average cost about 3 ms tracing, 180 ms processing, 28 ms detection per transaction. A worst-case
  burst would need roughly 110 GB RAM and 120 cores, which one server can supply. (pp. 11–12)
- Rerun 27 Oct – 16 Nov 2025: 108.5K related transactions, 71 alerts (0.07%), none were attacks. (p. 12)
- Ported to BSC: found 11 of 12 usable 2025 incidents, false-positive rate 0.19%. (p. 12)

## Limitations the authors state (p. 13)
- Prevention needs the transaction to be visible in the mempool; private relays hide it until it is
  included in a block.
- Poisoning: if an alert caused by a legitimate admin action is dismissed, that behaviour becomes
  "normal" and a later malicious use of a sibling path may pass.
- Needs ABIs and storage layouts (source code) for full precision.

## Use in our papers
- **Related work for C4 (Paper B).** HOUSTON is the strongest real-time detector we compare
  against. State the difference precisely: HOUSTON models a *protocol's* normal behaviour; our
  watcher reconciles a *custodian's* landed transfers against an independent intent ledger.
- **Gap argument.** The filter on p. 11 drops plain ETH and standard token transfers before
  modelling. A custodial drain (Bybit after the upgrade, Binance 2026) consists exactly of such
  transfers, so this class falls outside HOUSTON's design, not just its evaluation. Phrase this as a
  scope difference, not a flaw.
- **Evaluation design.** Their split (incident replay, then live run with false-positive rate per
  protocol, then a second chain) is a good template for our Paper B evaluation section.
- **Threats to validity.** Their poisoning discussion maps onto our policy-update path (C2): an
  approved but malicious policy change becomes the new normal.

## Do not
- Do not say "40-day deployment" (an earlier note of ours was wrong). It is 20 days plus a separate
  3-week rerun.
