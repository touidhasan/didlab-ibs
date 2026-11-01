# liu2024montecrypto — Count of Monte Crypto (arXiv v3, 2026)

Liu, Luo, Yan, Izhikevich, Grant, Stefan, Voelker, Savage (UC San Diego). *Count of Monte Crypto:
Accounting-based Defenses for Cross-Chain Token Bridges.* arXiv:2410.01107v3, 19 Apr 2026
(v1 Oct 2024 was titled "... Cross-Chain Bridges"). No peer-reviewed venue printed on v3.
Copy read: arXiv v3, 18 pages, sha256 `fb046992…d306` (held locally, not in git). Page numbers are PDF pages.

## What it is
Every bridge attack in their data broke one invariant: value withdrawn on the destination chain
should equal value deposited on the source chain, less fees. Check that invariant and you catch the
attack whatever bug enabled it. (p. 1)

## Numbers worth citing
- Retrospective analysis of more than 20M bridge transactions (2021–2023 attacks, >$2.6B stolen);
  the invariant flags every known attack plus several unreported likely ones. (p. 1)
- Live audit of Wormhole for 10 months (Oct 2024 – Jun 2025), about 40% of its withdrawals across
  10 chains: 202k transactions audited, 103 alerts (0.05%), all traced to their own code or RPC
  faults; no real attacks in the period. Three injected attacks were caught. (p. 11)
- The live monitor reads finalized blocks only and uses Ethereum's ~12-minute finality as its
  clock, polling every minute. Detection latency is therefore minutes. (p. 10)
- Report-then-execute prototype: fewer than 40 changed lines in Wormhole; on testnets, 100
  deposit/withdraw pairs with 3 malicious ones, all 3 rejected. (pp. 11–12)

## Scope the authors exclude (p. 5)
Out of scope: attacks that move funds straight from a bridge's wallet to the attacker with a
compromised key (no withdrawal step), attacks on users, and swap bridges.

## Use in our papers
- **Closest prior art for C4 and for C1's architecture.** Report-then-execute (p. 11) is an
  independent party that must vouch for a transaction before it executes, the same shape as IBS's
  intent check before signing. Credit it explicitly.
- **The difference we claim.** Their independent record is the on-chain deposit. An exchange hot
  wallet has no on-chain event that justifies each withdrawal; the justification lives in the
  exchange's own ledger. IBS supplies that record from a separate trust domain (the intent ledger).
  Their own exclusion (p. 5) is exactly the custodial case; cite it.
- **Timing contrast.** Minutes (finalized blocks) versus our Besu measurements of about 2 s to
  containment. Make the comparison fair: they chose finality for correctness, and we should say
  what our watcher does about reorgs (QBFT has immediate finality; public Ethereum does not).
- **Deployment evidence.** An earlier version inspired Bascule (Cubist; used by Lombard), which uses
  TEEs for the reporter (p. 11). Useful for the proposal's "path to practice" argument.

## Do not
- Do not write "announce-then-execute" (our earlier wording, from a secondary summary). The paper's
  term is report-then-execute.
