# Prior art: the hoarding gap and its fix (first pass, 2026-11-15)

**The claim under test.**
- A rolling budget that counts a signature when the signer gives it leaks. An attacker holds signatures and sends
  them after the window has moved on, so a fresh window's budget is spent on top of them.
- The single-incident bound becomes B + Wνb instead of B.
- Counting a signature until it executes, and for T blocks after, restores B.
- Evidence so far: TLC (`formal/results/2026-11-13-tlc/`) and the sweeps (`testbed/results/2026-11-15-sweeps-10seeds/`).

**Status: no prior description of the gap or the fix found yet.** This is one session of web searches, not a
systematic search. The closest academic work (ePrint 2026/2176) has been read and does not cover it. A patent
search and the vendors' counting rules remain before the claim goes into a paper (see "Still to do").

## What exists

| Finding | Sources | What it means for us |
|---|---|---|
| **Rolling-window spending limits at the signer are standard.** Fireblocks, Dfns, Ripple's Wallet-as-a-Service, Cobo, Silence Labs Duo and Privy all document per-wallet cumulative limits over a time window, checked before signing. | Fireblocks TAP developer guide; Dfns policies reference (`TransactionAmountVelocity`); Ripple Wallet policy concepts (`ROLLING_DURATION`); Cobo spend limits; Silence Labs Duo stateful policy; Privy stateful policies | The budget itself (C3) is not ours. Our papers must say so. |
| **At least one product documents counting at signing, on a flow where the client broadcasts.** Privy's aggregation tracks `eth_signTransaction`, which returns signed bytes. The application broadcasts them later, and per its docs the aggregation updates when signed, not when confirmed on-chain. | docs.privy.io, "Using stateful policies" and "Stateful policies" | This is the accounting our analysis shows leaks when signed bytes can be held. Privy frames these policies as disaster prevention, not strict enforcement. **We have not tested Privy and make no claim about it.** At most, the paper can say the counting-at-signing rule appears in documented products. |
| **For the other vendors, the counting rule is not documented.** Fireblocks, Dfns, Ripple and Cobo don't say whether a signed but unbroadcast transaction counts, or when. In sign-and-broadcast flows the platform holds the bytes, so an outside attacker cannot hoard them. In raw-signing flows, an industry post notes that raw signing routes around velocity limits. | as above; Station70, "Raw signing is a liability, not a feature" (2026) | The gap matters where signed bytes leave the signer: raw signing, and in-house signers with a separate broadcaster, which is our threat model. |
| **The closest academic work: Budgeted Threshold Signatures** (Chen, Zhang, Cheng; IACR ePrint 2026/2176, September 2026). Per-epoch budgets are secret-shared among the signers and enforced inside the signing session. It also proves that gating a threshold signature with a passively secure MPC comparison can be bypassed. **Read in full on 2026-11-15** (`survey/notes/chen2026bts.md`). | `chen2026bts` | **It counts at signing and does not discuss held signatures.** Its budget soundness (Definition 2, p. 6) bounds the amount *signed* per epoch. On-chain verification is unchanged by design, so a signature from epoch e stays valid when broadcast in e+1; an off-chain state-log verifier only flags it afterwards (p. 8). That is our gap, in a fixed-epoch budget. The work is complementary: it makes the check hard to bypass, and we bound what *executes* per window. Our fix could run inside its authenticated gate. |
| **On-chain limits count at execution**, so they have no hoarding gap. Example: Chainlink ACE's `VolumeRatePolicy` takes the period from the block timestamp. Safe's allowance module and ERC-7265 also count on-chain. | docs.chain.link, VolumeRatePolicy | Our fix makes a signer-side budget behave like an on-chain one, without its weakness: upgrading on-chain policy is itself a signed request, the Bybit path (framing §2). |
| **Transaction expiry is an alternative.** Some chains let a signed transaction carry a validity window; Privy documents one for Tempo transactions. A signature that expires within T cannot be held past the window. Ethereum transactions have no expiry, so the fix is needed there. | docs.privy.io (Tempo validity window) | Worth a paragraph. Expiry ≤ T closes the gap on chains that support it. Our fix covers chains that don't. |
| **Broadcast-side checks** (SettleMint DALP): the signed payload is checked against the request, with a nonce reservation, before broadcast. | docs.settlemint.com, "Signing flow" | This is an orchestration-side control. Our threat model assumes orchestration is compromised, so it does not stop A10. |
| **Card payments: authorization holds.** An authorized but unsettled payment reduces available credit until it settles or expires. | (general knowledge; cite a payments reference in the paper) | Our fix is this accounting rule applied to signatures. The paper should say so plainly and claim only the application, the bound and the evidence. |
| Patents | one keyword search, no relevant hit | **Not a patent search.** Needs a proper one before any novelty statement. |

## Still to do (before the claim appears in a paper)

1. ~~Read ePrint 2026/2176 in full.~~ Done 2026-11-15: it counts at signing and does not discuss held
   signatures (above).
2. **A proper patent search** (Google Patents, USPTO full text). Terms: velocity limit, signed transaction,
   pending, broadcast, authorization hold, custody.
3. **Vendor counting rules.** Ask or test, on a testnet only, whether Fireblocks, Dfns, Ripple or Cobo count
   signed but unbroadcast raw-signing requests, and for how long. Report only what their documentation states or
   what we measure.
4. **Frame the contribution carefully.**
   - Not ours: rolling budgets and the authorization-hold idea.
   - Ours: identifying the leak for signer-side budgets when signed bytes leave the signer; the bound
     B + Wνb; the fix with its TLC check and measurements; and the comparison with transaction expiry.
