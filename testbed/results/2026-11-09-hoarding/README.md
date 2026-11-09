# Hoarding attacker A10, seed 7 (2026-11-09)

**Question.** Do the A10 figures behind the revised bound T3 hold in a recorded campaign? Until now they
came from development runs (commit `9885bf2`).

**Answer.** Yes. All four cells reproduce the development figures to the dollar. They also replay
identically on a second machine.

## Setup

- Campaign `c20261109155415-9343dd`, commit `5d82e48` (clean).
- `sim.mjs` sha256 `0a706ddf…`, the same as at `0ca6e04`. `simChanged` is false for every run.
- Hardhat in-process, Node v22.23.4, host `didlab-research`, turbo off.
- Seed 7, horizon 1,200, one run at a time.
- 4 of 4 runs completed on the first attempt.

File: `hardhat-s7.csv` (dashboard export).

## Results

| Run | Loss | Held signatures (signed in an earlier window) | Sent after the window reset | Detect / contain step | Customer withdrawals completed / blocked |
|---|---|---|---|---|---|
| R1-A10 | USD 72.89M | USD 4.00M | USD 68.89M | – / – | 703 / 23 |
| R3-A10 | USD 21.99M | USD 4.00M | USD 17.99M | 301 / 301 | 440 / 286 |
| R4-A10 | 0 | – | – | 0 / 0 | 114 / 613 |
| R4-A10i | USD 21.99M | USD 4.00M | USD 17.99M | 301 / 301 | 440 / 286 |

The split by vector comes from the `attackerVectors` field of the replay (below). The CSV has the totals only.

## What the runs show

- **Every loss is within the bounds.**
  - R1 is within B⌈H/T⌉ = USD 100M.
  - R3 and R4-A10i are within the revised single-incident bound B + Wνb = USD 25M + 3 · 4 · USD 1M = USD 37M.
- **The hoarder waits out the budget window.** A10 signs 4 cap-sized USDT transfers (ν = 4, b = USD 1M) on one
  idle wallet at t = 0 and holds them. Containment comes at step 301, the block where they are finally sent.
  By then those USD 4.0M are no longer counted against the budget, which allows a fresh USD 25M in the new window.
- **The simulation does not exceed B.** R3-A10 stays below B = USD 25M only because customer withdrawals used about
  USD 7M of the new window. The counterexample to the old claim (Loss ≤ B) is TLC's trace
  (`formal/results/2026-11-05-tlc/`), not this run.
  - A low-load run could show the excess in the simulator; it is not done yet.
  - A10 hoards on one wallet. The W = 3 worst case (every hot wallet hoarding) is not exercised.
- **Intents stop A10 unless the intent authority is compromised.** R4-A10 loses nothing: the first sign
  request without an intent raises the alarm at t = 0. With the intent authority compromised (R4-A10i), R4
  loses exactly what R3 does: intents add nothing once the attacker can mint them.
- **Freezing costs customers.** R4-A10 blocks 613 customer withdrawals after the t = 0 freeze. R3 and R4-A10i
  block 286 after the freeze at step 301.

## Replay on a second machine

The four cells were rerun with the same `sim.mjs` on a different machine (a cloud container, not the VM host).
Loss in USD, alerts during the attack and the split by vector were identical in all four. Command, from
`testbed/`:

```
for s in R1-A10 R3-A10 R4-A10 R4-A10i; do OUT=/tmp/a10-$s.json node sim.mjs "=$s"; done
```
