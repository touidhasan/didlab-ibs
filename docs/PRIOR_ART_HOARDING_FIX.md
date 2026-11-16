# Prior art: the hoarding gap and its fix (first pass, 2026-11-15)

**The claim under test.**
- A rolling budget that counts a signature when the signer gives it leaks. An attacker holds signatures and sends
  them after the window has moved on, so a fresh window's budget is spent on top of them.
- The single-incident bound becomes B + Wνb instead of B.
- Counting a signature until it executes, and for T blocks after, restores B.
- Evidence so far: TLC (`formal/results/2026-11-13-tlc/`) and the sweeps (`testbed/results/2026-11-15-sweeps-10seeds/`).

**Status (2026-11-15).**
- **No prior description of the leak, the bound or the counting mechanism found.** The closest academic work
  (ePrint 2026/2176) counts at signing.
- **A 2018 patent application already states a daily cap over *broadcast* transactions as an example rule,**
  without any mechanism. So we claim the analysis and the mechanism, not the idea of a broadcast-time cap.
- **The nonce window is prior art too.**
- **Remaining:** a classification-based patent search and the vendors' counting rules (see "Still to do").

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
| **Patents: a cap stated over broadcast transactions, with no mechanism.** GK8's application (now Galaxy Digital; US 2021/0049591 A1, priority 2018-02-15, pending) gives a co-signer rule as an example: the sum of all transactions *broadcast* by a wallet in one day stays below a cap. It describes no way to count or enforce that sum, nor how co-signers learn what was broadcast. Separately, it lets a transaction optionally carry an expiration date. | `gk8_2021wallet`; patent search below | **The closest prior art found; it narrows our claim.** The *idea* of capping what is broadcast rather than what is signed is stated there as an example. What it lacks, and what we contribute, is the analysis: the leak of signing-time counting (B + Wνb), a mechanism (count until the mined nonce passes, plus T), and the evidence (TLC, sweeps). The paper must cite it and must not claim the idea of a broadcast-time cap. |
| **Patents: the nonce window is not ours.** DLT Global (now Knnx; US 11,095,431 B2, priority 2019-12-13) defines a "nonce window" that limits how many transactions per identity may be pending broadcast at a node. It has no value limits. | `dltglobal2021txmanager` | Our ν applies the same idea at the signer. Cite it where ν is introduced. |
| **Patents: limits at the signer are broadly patented.** Daily and weekly limits in an enclave hot wallet (WO 2021/061415 A1); a custody policy engine with value thresholds (EP 4341834 A1); and an HSM that checks a quorum, signs and submits the withdrawal itself (Anchorage, US 2019/0266576 A1, US 11,494,763 B2). | patent search below | C2 and C3 are not ours. Designs where the HSM signs *and* submits keep signed bytes inside, so orchestration cannot hoard them. Our threat model is the other architecture. |
| **Payments: time-window velocity rules over authorizations**, for example amounts over 24 or 48 hours (WO 2011/008953 A2), and aggregation limits (US 8,584,936 B2). | patent search below | Supports the authorization-hold analogy. |

## Still to do (before the claim appears in a paper)

1. ~~Read ePrint 2026/2176 in full.~~ Done 2026-11-15: it counts at signing and does not discuss held
   signatures (above).
2. **Patent search: first pass done 2026-11-15** (log below). It found GK8's broadcast-cap example and DLT
   Global's nonce window. Not yet done: a classification search (CPC G06Q20/40, G06Q20/36, H04L9/32, G06Q20/065)
   and USPTO full text (PPUBS). This is a novelty check for the paper, not a legal clearance. The UMKC library or
   technology-transfer office can run a professional search if the claim ever matters beyond the paper.
3. **Vendor counting rules.** Ask or test, on a testnet only, whether Fireblocks, Dfns, Ripple or Cobo count
   signed but unbroadcast raw-signing requests, and for how long. Report only what their documentation states or
   what we measure.
4. **Frame the contribution carefully.**
   - Not ours: rolling budgets and the authorization-hold idea.
   - Ours: identifying the leak for signer-side budgets when signed bytes leave the signer; the bound
     B + Wνb; the fix with its TLC check and measurements; and the comparison with transaction expiry.

## Patent search log (first pass, 2026-11-15)

Google Patents, through web search restricted to patents.google.com, English. The two closest results were opened on
Google Patents itself.

| Query | Relevant results |
|---|---|
| velocity limit signed transaction not yet broadcast blockchain wallet spending limit pending | US 11,095,431 B2 (nonce window); EP 3385894 A1 (maximum amount inside the signed transaction, checked by the node) |
| Fireblocks transaction authorization policy time period amount aggregation signing | payment aggregation and velocity patents (US 7,707,105 B2; WO 2011/008953 A2; US 8,584,936 B2) |
| Coinbase cold storage withdrawal velocity limit signing rate limit | cold-storage patents; none on velocity counting |
| BitGo policy velocity limit multi-signature co-signing wallet | **US 2021/0049591 A1 (GK8)**; WO 2021/061415 A1; US 2022/0116214 A1 (on-chain multisig daily limit) |
| Fireblocks Ltd policy engine transaction authorization MPC signing | EP 4341834 A1 (custody policy engine); Fireblocks WO 2020/046786 A1 (cited by others; not opened) |
| signing service record signed transaction until confirmed count toward limit reserve amount | none relevant |
| Anchorage Digital custody policy HSM withdrawal velocity time window | US 2019/0266576 A1, US 11,494,763 B2 (HSM signs and submits) |
| hot wallet exposure limit outstanding unconfirmed withdrawals counted until confirmation | WO 2021/061415 A1 (daily and weekly limits); none on counting until confirmation |
| pre-signed transaction risk policy engine limit not yet submitted cancel nonce replace custody | none relevant |

Not opened, to read before final novelty wording: Fireblocks WO 2020/046786 A1 ("System and method for securing
crypto-asset transactions"), and the full claims of GK8 US 2021/0049591 A1 (only the description was read).

