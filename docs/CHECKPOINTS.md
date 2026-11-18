# Checkpoints

Each checkpoint (CP1 to CP9, see the timeline) closes at a commit, so every number in a draft traces to one. The
commits are recorded here. Git tags `cp1` to `cp9` will point to the same commits. They are pushed from a machine
with write access: the research VM's deploy key is read-only, by design.

| Checkpoint | Closed | Commit | Tag pushed | What it contains |
|---|---|---|---|---|
| CP1 Variance known | open | – | – | Seed variance and probe verdict done. Waiting on the submitting institution and the Besu report decision. |
| CP2 Adaptive attackers | 2026-11-07 | `0ca6e04` | not yet | A3r and A9 on both clients at seed 7; TLA+ model checked in TLC |
| CP3 Model checks pass | open | – | – | A5, A8, the model checks and the prior-art search done (Fireblocks patent unread). Survey round 2 done from this workspace (2026-11-15); forward snowballing and a database search need library access. Catalog verification of every candidate of $100M or more done (2026-11-18): 33 incidents, 24 evaluated; CH1 narrowed to "since 2024". Letters remain |
| CP4 Results freeze | 2026-11-15 | `f24ac1a` | not yet | Besu core 15 at seeds 7–11; Hardhat full matrix and sweeps at 10 seeds; `testbed/tools/rebuild.mjs` |

To push the tags from a clone with write access:

```
git fetch origin
git tag -a cp2 0ca6e04 -m "CP2 Adaptive attackers"
git tag -a cp4 f24ac1a -m "CP4 Results freeze"
git push origin cp2 cp4
```
