# Experiment dashboard

Launch campaigns, watch runs and the chain live, and browse, compare and export results — with full
provenance on every run. Plain Node 20+, no dependencies, no build step.

```bash
cd dashboard
node server.mjs            # http://127.0.0.1:8090
npm test                   # end-to-end test (short Hardhat campaign)
```

| Env | Default | Meaning |
|---|---|---|
| `PORT` | `8090` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address. **Keep it on localhost**: the server starts processes and has no login. |
| `RPC` | `http://127.0.0.1:18545` | Default chain for rpc campaigns and the health header (the research network) |
| `DATA_DIR` | `<repo>/runs` | Where runs are stored (git-ignored) |
| `CONCURRENCY` | `1` | Runs executed at once. Keep 1 for timing measurements on a real chain; every run records how many ran alongside it. |

## Reaching it from your computer

The dashboard listens on the VM's localhost only. Tunnel to it over SSH (works over Tailscale):

```bash
ssh -N -L 8090:127.0.0.1:8090 didlab@didlab-research     # or didlab@172.16.0.80
# then open http://localhost:8090
```

## Running it as a service on the research VM

```bash
sudo cp dashboard/didlab-ibs-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now didlab-ibs-dashboard
journalctl -u didlab-ibs-dashboard -f
```

## What it does

- **Campaigns**: pick runs (configuration × attacker), seeds, horizon, backend (Hardhat or an RPC chain) and
  per-step tracing; see an estimate of wall-clock time; queue; cancel.
- **Runs**: live status and progress, loss, detection/containment, benign withdrawals that actually landed,
  containment time in seconds (rpc), commit. Select runs to compare or export.
- **Run detail**: outcome, signer denials, event log, balances-over-time chart (traced runs), process output,
  and provenance: exact command, git commit (flagged if uncommitted changes were present), `sim.mjs` SHA-256,
  client, chain id, host, concurrency at start, timestamps, exit code.
- **Compare**: loss per run, attacker holdings over time (traced runs, up to 8), side-by-side table, and an
  explicit **"not like-for-like"** warning whenever runs differ in horizon, backend, chain, simulator code,
  or used uncommitted code.
- **Export**: CSV of selected runs (or a whole campaign) with all summary and provenance columns.

## Storage and restarts

Each run is a directory under `DATA_DIR/runs/<runId>/` (`run.json`, `result.json`, `log.txt`); campaigns are
`DATA_DIR/campaigns/<id>.json`. Files are written atomically. On restart, queued runs resume; runs that were
executing are marked **interrupted** and never silently re-run or counted. To keep results for a paper,
copy the run directories (or the CSV) into `testbed/results/<date>/` and commit them.

## Start-up crashes (limitation E14)

Simulator processes occasionally die from a signal in their first second, before any output (SIGSEGV, or
SIGABRT after `free(): invalid pointer`).
- **Retry.** The runner retries such a run up to twice. It runs right after the failed attempt with identical
  parameters, as `<runId>-a2` and then `-a3`.
- **Record.** Every attempt keeps its own record (`attempt`, `retryOf`, `retriedBy`, `signal`, `exitCode`)
  and appears in the campaign and the CSV export. The campaign's counts therefore still show the failed
  attempts.
- **Limits.** A run that crashes after its first progress report is never retried automatically.
- **Diagnostics.** Runs start with `--report-on-fatalerror`, so a V8 fatal error leaves a report in the run
  folder.
- **Finding the cause.** `testbed/tools/start-probe.mjs` measures crash rates for Node, viem, solc-js, Hardhat
  and the full simulator start.
- **Test.** `node test-retry.mjs` checks the retry with a fake simulator; CI runs it.
