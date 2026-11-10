# Formal model (TLA+)

`IBS.tla` models the signer's decision rule, the intent authority, the watcher's containment and an attacker
that controls the request builder. TLC checks the properties of `docs/RESEARCH_FRAMING.md` §6 over every
behaviour up to a small horizon.

**Status: checked on 2026-11-05.** TLC ran on the research VM at commit `9885bf2`, with the host's turbo off.
- TLC version: `TLC2 Version 2026.11.06.005304 (rev: 3ec1cc4)`, the nightly build that GitHub serves under the
  v1.8.0 pre-release tag.
- Java: OpenJDK 21, 4 workers.
- Logs, with both counterexample traces: `results/2026-11-05-tlc/`.

Because the tag is a moving nightly, a rerun should record the jar's sha256. All 8 outcomes matched `expected.txt`: 6 configurations pass, and the
2 expected violations were found.

| Config | Outcome | Distinct states |
|---|---|---|
| `R4-A4` | pass | 7,822,448 |
| `R1` | pass | 5,131,758 |
| `R3` | pass | 1,795,505 |
| `R3-hoarding` | `T3c_ContainedWithoutHoarding` violated, as expected | 523,178 (at the violation) |
| `R2` | `T5_NoLoss` violated, as expected | 1,376 (at the violation) |
| `R4` | pass | 403 |
| `R4t` | pass | 403 |
| `Benign` | pass | 61 |

`R4` and `R4t` are small because no attacker request is ever signed: the signer refuses all of them. The
reachable states are the customers' withdrawals and the alarms. Run times: R4-A4 5 min 21 s, R1 2 min 23 s,
R3 47 s, the rest under 10 s.

**Added 2026-11-10, not yet checked: the hoarding fix.** The constant `ChargeOutstanding` makes the budget count
a transaction signature while it is unexecuted, and for T blocks after it executes (variable `done`). Three
configurations use it, and all are expected to pass:
- `R3h` checks the old bound Loss ≤ B (`T3c_ContainedWithoutHoarding`), which `R3-hoarding` violates without the
  fix, together with T2, T3a, T3b and T4.
- `R4h` checks the R4 properties plus the same bound.
- `Benign-h` checks that the fix refuses no customer (T6, T7).

Every earlier configuration sets `ChargeOutstanding = FALSE`. There, `done` stays empty, so their state counts
should not change. A rerun with `check.sh` will show that.

The two counterexamples (`results/2026-11-05-tlc/`):
- **R2 (T5).** In block 0 the attacker gets a transfer of 3 signed, broadcasts it, and it executes. The loss is 3
  before the block ends and before the watcher can act.
- **R3-hoarding (old bound Loss ≤ B).**
  - Block 0: the attacker gets two transfers of 2 signed (the full budget of 4). It holds the first and
    broadcasts the second, which waits behind the first's nonce.
  - Block 2: the window no longer includes block 0. The attacker broadcasts the held transfer, gets a third
    signed from the fresh budget, and all three execute. The loss is 6 > B = 4.
  - The bound T3c, Loss ≤ B + ν·Cap = 8, still holds.

## Run

```
mkdir -p formal/.tools
# download tla2tools.jar (v1.8.0) from https://github.com/tlaplus/tlaplus/releases/tag/v1.8.0 into formal/.tools/
sh formal/check.sh
```

`check.sh` runs TLC once per configuration in `cfg/` and compares each outcome with `expected.txt`. It prints
one line per configuration and exits non-zero on any mismatch. TLC logs go to `/tmp/ibs-tlc/`.

## What is checked

| Config | Configuration modelled | Properties | Expected |
|---|---|---|---|
| `R4-A4` | Full IBS; the intent authority is compromised | T1, T2, T3a, T3b, T4 | pass |
| `R4` | Full IBS | T1, T2, T3a–c, T4, T5 (no loss at all), T7 | pass |
| `R4t` | Full IBS with tiered response | T1, T2, T4, T5, T7 | pass |
| `R3` | Policy and containment, no intents | T2, T3a–c, T4 | pass |
| `R1` | Policy only | T2, T3a, T3b | pass |
| `Benign` | Full IBS, no attacker | T4, T6, T7 | pass |
| `R2` | Containment only, no pre-signing controls | T5 | **violated**: a one-block drain |
| `R3-hoarding` | As R3 | old bound Loss ≤ B | **violated**: held signatures (A10) |

The properties:

- **T1 Intent soundness.** With intents on, every signature carries an intent the authority signed for exactly
  this destination and value, and no intent is used twice.
- **T2 No delegation.** The semantic signer never signs an EIP-7702 authorization.
- **T3 Exposure bound.**
  - (a) Each window of T blocks carries at most B of signatures.
  - (b) Loss ≤ B per window.
  - (c) With containment on every attacker outflow, Loss ≤ B + ν·Cap.
- **T4 Containment latency.** A block with an alarm, an unexplained outflow or a delegation ends with the signer
  frozen. This is an action property.
- **T5 Detection alone fails.** Without pre-signing controls, the attacker can drain before the watcher acts.
  The violated invariant `loss = 0` is the evidence.
- **T6 No false containment.** Without an attacker, nothing freezes and no legitimate request is refused.
- **T7 Budget non-exhaustion.** With intents on and the authority intact, no legitimate request is ever refused
  for budget.

## Abstractions

The model deliberately simplifies the system:

- **Scope.** One hot wallet and one asset; values are in budget units; one step is one block.
- **Unlimited funds.** A broadcast transaction with the next nonce always executes before its block ends.
  Queues of underfunded transactions (limitation E8, attackers A3r and A9) are therefore outside the model and
  are covered by the simulator.
- **Signatures.** Unforgeability (assumption A-sig) is modelled as membership in the authority's ledger. A
  forged intent is an id the authority never issued. The cryptographic argument for T1 is the separate,
  written reduction.
- **The attacker.** It controls the request builder. It may ask for any transaction or authorization, with any
  of a small set of nonces, values and intent ids, and may hold a signature unsent.
- **Legitimate traffic.** At most one 1-unit withdrawal per block, signed and sent at once. `ASSUME T <= B`
  keeps it within budget.
- **Watcher.** It reconciles each block against the intent ledger and contains at the block's end: it freezes
  the signer and revokes any delegation.

## Constants

B = 4, T = 2, Cap = 2, ν = 2, H = 3 (blocks 0–3), at most 2 attacker signing requests per block. These are
small enough for TLC to enumerate every behaviour. They are not the simulator's values (B = USD 25M,
T = 300 blocks, cap USD 1M, ν = 4).

A pass therefore shows the property holds for every behaviour at these sizes; it is not a proof for all sizes.
Apalache's inductive-invariant check, and possibly TLAPS or Lean, would extend T3 to all sizes (planned, CP5).
