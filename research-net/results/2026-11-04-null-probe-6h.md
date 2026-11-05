# Null-read probe on Besu, 6 hours (2026-11-04)

**Question.** Does Besu answer `eth_getBalance` with `null` (limitation E13) when no simulator is running?

**Answer.** Yes.
- **How often.** 113 nulls in 432,040 reads (0.026%), with no errors.
- **When.** Every null came 0–7 ms after `eth_blockNumber` first showed a new block, and they hit only 15 of 10,801 blocks.
- **Which tags.** Reads at the explicit new block number returned null as well as reads at `latest`. So for a few milliseconds Besu reports block N as the newest block while the state of block N cannot yet be read.
- **A 30-second pattern.** 13 of the 15 affected blocks were imported at second :17 or :47 of the minute. Something that runs every 30 seconds on the machine appears to widen the window. It is not the Docker health check: the Besu image checks every 5 s (`[ -f /tmp/pid ]`), not every 30 s. The cause is open.

## Setup

- `research-net/probe-null-reads.mjs` with `MINUTES=360 REPEAT=20`, polling every 20 ms.
  - On every new block it reads the faucet's balance 20 times at `latest` and 20 times at the block number.
- Run against node 1 (`http://127.0.0.1:18545`): `besu/v26.8.0/linux-x86_64/openjdk-java-25`, chain 252701, 4 validators, 2 s blocks.
- Window: about 2026-11-04 00:49 to 06:49 UTC. Nulls were seen 01:54–06:29 UTC.
- Host CPU turbo was **on**. The host's CPU computes incorrectly under turbo (`testbed/results/2026-11-04-host-cpu/`).
  - The narrow timing window and the 30-second regularity look like a race inside Besu rather than random CPU errors.
  - Repeating the probe with turbo off will check this.

File: `2026-11-04-null-probe-6h.jsonl.gz`, one line per null and a final summary line. The `nohup` banner line was removed.

## Affected blocks

| Block | Block mod 30 | First null (UTC) | Nulls | at `latest` | at number |
|---|---|---|---|---|---|
| 138894 | 24 | 01:54:47.006 | 1 | 1 | 0 |
| 139014 | 24 | 01:58:47.011 | 1 | 1 | 0 |
| 139224 | 24 | 02:05:47.007 | 9 | 5 | 4 |
| 139464 | 24 | 02:13:47.007 | 11 | 6 | 5 |
| 141114 | 24 | 03:08:47.008 | 12 | 6 | 6 |
| 141564 | 24 | 03:23:47.009 | 5 | 3 | 2 |
| 142539 | 9 | 03:56:17.009 | 7 | 4 | 3 |
| 142614 | 24 | 03:58:47.009 | 12 | 6 | 6 |
| 144463 | 13 | 05:00:25.006 | 21 | 11 | 10 |
| 146424 | 24 | 06:05:47.011 | 1 | 1 | 0 |
| 146845 | 25 | 06:19:49.012 | 1 | 1 | 0 |
| 147024 | 24 | 06:25:47.004 | 18 | 9 | 9 |
| 147039 | 9 | 06:26:17.006 | 1 | 1 | 0 |
| 147054 | 24 | 06:26:47.005 | 1 | 1 | 0 |
| 147129 | 9 | 06:29:17.006 | 12 | 6 | 6 |

## Consequences

- **The simulator's guard is the right fix.** It already retries a null state read (`nullRetry` in `testbed/sim.mjs`), and in the campaigns every null was recovered.
- **This is a candidate upstream report.** The probe is a minimal reproduction that needs no simulator.
  - Expected behaviour: once a node reports block N, it either serves state at N or returns an error, never `null`.
  - The report waits for the turbo-off repeat, so a hardware cause is excluded first.

## Repeat with turbo off (running)

- **The run.** Started 2026-11-05 at about 14:00 UTC: same command and settings, with turbo off on the host since then (`no-turbo.service`).
- **Node restart.** The four Besu nodes were restarted at 2026-11-04 16:34:52 UTC, after the first probe. Docker's restart count is 0, so this was a deliberate restart, not a crash.
- **Prediction, written down before the result.**
  - If the 30-second pattern comes from a timer inside Besu that started with the node, the nulls should now cluster at seconds :22 and :52.
  - If it comes from something on the machine tied to the wall clock, they should stay at :17 and :47.

