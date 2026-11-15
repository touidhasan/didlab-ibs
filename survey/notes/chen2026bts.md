# chen2026bts: Budgeted Threshold Signatures (IACR ePrint 2026/2176)

Chen, Zhang, Cheng. *Budgeted Threshold Signatures: Protocol-Native Spending Limits with Zero On-Chain
Footprint.* IACR Cryptology ePrint Archive, Paper 2026/2176 (received 2026-09-23). License CC BY.
Copy read: ePrint PDF, 19 pages, sha256 `61931b33ae3b…` (held locally, not in git). Page numbers are PDF pages.

## What it is

- **The problem.** Spending limits in threshold custody all live outside the signing protocol: in central policy
  engines, on-chain covenants or co-signers. The authors say this leaks budget state, binds the limit to one
  chain, and adds a bypass surface. (pp. 1–2)
- **The construction (BTS).** Each epoch's budget is Shamir-shared among the n signers. Every payment runs an
  MPC comparison of the shared budget against its amount, and an honest signer releases its FROST2 share only
  after a check that passes and is verified. (pp. 3, 8)
- **The no-go result.** For a class of "linear gate-in-combination" protocols, a passively secure comparison lets
  one corrupted signer flip every rejected payment to accepted, deterministically. An authenticated gate (MACs
  on every wire) catches that bias. (pp. 3, 6–8)
- **Batching.** Sending payments in batches brings enforcement down to about one network round trip per
  payment. (p. 3)

## How the budget is counted: the point that matters for us

- **Budget soundness counts what is signed per epoch** (Definition 2, p. 6). The adversary wins only if it
  outputs valid signatures carrying the epoch's state-binding tag whose amounts sum to more than B0. Nothing in
  the definition concerns when a signature is broadcast or executed.
- **On-chain verification is unchanged by design** (p. 1; "zero on-chain footprint"). The tag H(epoch‖seq) is
  folded into the signed message, so stale-state replays "are flagged by any state-log verifier" (p. 8). That is
  detection after the fact, off-chain. The chain does not reject a signature from an earlier epoch.
- **So signatures held into a later epoch stay valid.** A signature produced in epoch e and broadcast in epoch
  e+1 counts only against e's budget, while e+1's budget is fresh. That is our hoarding gap, in a fixed-epoch
  budget. Fixed epochs add the boundary effect: B0 at the end of e plus B0 at the start of e+1 amounts to 2·B0
  in a short interval.
- **Not covered by its other cases.** The paper does not discuss holding signatures. Its "cross-epoch attacks"
  (EXP-017/018, p. 14) are about retrying across sessions under corruption, not about when a signature executes.
- **The concurrency lemma** (Lemma 2, p. 16) keeps the signed sum within B0 per epoch. It says nothing about
  execution.

## Use in our papers

- **The closest formal treatment of signer-side budgets.** Cite it in related work, for Paper B and the proposal.
- **State the difference precisely.**
  - BTS makes the budget check hard to bypass for a corrupted signer, and its soundness bounds the amount
    *signed per epoch*.
  - Our A10 result and the fix concern the amount *executed per window*, when signed bytes can be held.
  - The two are complementary: an execution-time budget could be enforced inside BTS's authenticated gate.
- **Do not call it flawed.** It never claims an execution-time bound, and its definition is explicit. Our point
  is that signing-time soundness, however well enforced, does not bound what lands in a window.
- **Useful for our vendor table (§2).** It summarises Fireblocks' TIMEFRAME limits, BitGo velocity limits (which
  BitGo's own documentation says recovery flows bypass), Nunchuk's co-signing limits and Google AP2's budget
  fields, with references (pp. 1–2). Check each primary source before citing it.

## Cautions

- The prototype is a single-process Python simulator, and the WAN figures come from an analytic model (pp. 14–15).
  Do not cite its latencies as deployment measurements.
- It assumes a static corruption model and an honest majority (p. 14).
