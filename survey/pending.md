# Found but not yet verified

Not cited until every bibliographic field is confirmed against a primary page.
Resolved items move to `references.bib`; see the git history of this file for what was resolved when.

| Item | What is known | Missing |
|---|---|---|
| CCSS v9.0 requirement text for 1.05.8 Spend Verification and 1.05.9 Multi-Signer Mechanism Usage | Control titles confirmed from the C4 peer-review template (docx, not machine-readable here) | Requirement text per level; needs the CCSS v9.0 matrix page or the user's copy |
| Zellic audit finding on an ERC-7265 implementation ("CircuitBreaker complexity introduces unnecessary attack surfaces") | reports.zellic.io, Yeet audit; describes griefing by triggering the breaker | Report date, client, whether the finding applies to the reference implementation |
| Bascule drawbridge (Lombard) | Monte Crypto v3 (p. 11) confirms an earlier version of the paper inspired it; Cubist's post "How to bridge Bitcoin securely" (https://cubist.dev/blog/how-to-bridge-bitcoin-securely) describes the design and names Lombard as a customer | Post date (not shown in the excerpt read); whether to cite it at all |
| Moore and Christin FC 2013: LNCS volume and pages | Venue confirmed (FC 2013, Okinawa) from author slides and press. A citing paper gives LNCS 7859, pp. 25-33 (secondary) | Springer page or DBLP to confirm volume, pages, DOI |
| XChainWatcher, Count of Monte Crypto: peer-reviewed venues | XChainWatcher: arXiv v3 2025-09-08; the first author's site hosts a file named bridge-anomalies_dsn_2025.pdf, so possibly DSN 2025 (unconfirmed). Monte Crypto: arXiv v3 2026-04-19, retitled "... for Cross-Chain Token Bridges", no venue listed | Check DBLP before submission |
| Chainalysis 2026 Crypto Crime Report (theft chapter) and 2025 mid-year update | Secondary coverage: $3.4B stolen in 2025, DPRK $2.02B, 76% of service compromises by value; mid-year: $2.17B from services by June 2025, Bybit ~69% | Primary pages (chainalysis.com blog); fetch needs approval |
| Homoliak and Perešíni SoK venue | arXiv:2402.17659 (2024); erinle2025sokwallets cites it as IEEE ICBC 2024 with a truncated DOI | IEEE Xplore page |
| SmartOTPs spending rules | AFT 2020 paper verified; whether its contract enforces daily limits (relevant to T3 counting) not read | Read the extended version (arXiv:1812.03598 v5) |
| EIP-8141 Frame Transaction and EIP-8266 expiring nonces | eips.ethereum.org: EIP-8141 is a Draft core EIP (authors include Vitalik Buterin and lightclient) defining an expiry-verifier frame that nodes drop from the public mempool after its deadline; EIP-8266 (created 2026-05-15, requires 8141) bounds replay protection by a short deadline | Creation date of 8141, authors of 8266, and whether expiry is a block-validity rule; needed only for the expiry paragraph |
| Chainalysis analysis of a South Korean exchange hot-wallet signing compromise (about KRW 44.5B) | Secondary summary (nhimg.org) only | Primary Chainalysis page; whether it is the Upbit November 2025 incident |
| Fireblocks, BitGo, Cobo, Dfns: counting rule for velocity limits | Docs read 2026-11-15 state the window but not when an amount counts (signing, broadcast or execution) | Ask vendors or test on sandboxes; see docs/PRIOR_ART_HOARDING_FIX.md |
