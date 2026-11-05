# Host CPU check (2026-11-04)

**Question.** Why do simulator runs on the research VM sometimes crash in their first seconds (limitation E14)?

**Answer.** The VM host's CPU, an Intel Core i9-13900K, computes incorrectly under turbo boost. Four results point there:
1. **The failures happen only while the Solidity compiler is working.** That is a deterministic WebAssembly computation (solc-js), compiling the same input every time.
2. **Turbo off removes them.** With turbo boost on, the full simulator start failed 14 times in 300. With turbo off, it failed 0 times in 300 (Fisher exact p = 0.0001).
3. **Another machine never fails.** It ran the same Node, code and dependencies with 0 failures in 300 simulator starts.
4. **Completed results are unaffected.** All 30 completed cells replayed on the other machine are identical, traces included.

This fits Intel's documented "Vmin shift" instability of 13th- and 14th-generation desktop processors. Microcode updates stop that degradation from getting worse but do not repair a processor that is already affected.

## Setup

- **Host.** Proxmox host `didlab` with an Intel Core i9-13900K.
  - Microcode 0x132: the host kernel log reads "Updated early from: 0x0000012c" (the BIOS) to "Current revision: 0x00000132".
  - The host kernel log (`journalctl -k -b`) has no machine-check or hardware-error entries.
- **VM.** `didlab-research` (Proxmox VMID 180, 4 vCPU, CPU type `host`), Ubuntu 24.04.5, Node v22.23.4 (`/usr/bin/node`).
- **Tool.** `tools/start-probe.mjs` at commit `a9cd0d1`. It starts short-lived processes back to back, one at a time.

## Results

| Probe | When (UTC) | Starts | Failures |
|---|---|---|---|
| VM, turbo on, all five kinds | 2026-11-04 13:11–13:18 | 1,500 (300 each) | **15**, details below |
| VM, turbo off (`intel_pstate/no_turbo = 1` on the host), `sim` only | 2026-11-05 03:29–03:36 | 300 | **0** |
| Other machine (Intel Xeon), all five kinds | 2026-11-04 | 1,500 (300 each) | **0** (`../2026-11-04-hardhat-10seeds/start-probe-other-machine.jsonl.gz`) |

The 15 failures with turbo on, by kind:

| Kind | Failures | What happened |
|---|---|---|
| bare (Node alone) | 0 of 300 | |
| viem | 0 of 300 | |
| solc (import solc-js, read its version) | 0 of 300 | |
| hardhat (import Hardhat, one RPC call) | 1 of 300 | SIGSEGV |
| sim (`sim.mjs --list`, which compiles the contracts with solc-js) | 14 of 300 | 9 × SIGSEGV; 2 × SIGABRT after glibc `free(): invalid pointer`; 3 × `TypeError: getWasmTableEntry(...) is not a function`, thrown from inside solc's WebAssembly code |

- **What the three TypeErrors mean.** The compiler's WebAssembly code tried to call through a function-table entry that held garbage. The same compiler compiling the same source produces that error only on this host with turbo on. That is a computation error, not a bug in the code.
- **The sim start is the one kind that does sustained heavy computation** (compiling the contracts). It fails far more often than the four lighter kinds.
- **The turbo-off start is slower** (median 1,354 ms against 749 ms). Slowing down could, in principle, also hide a timing bug. But the error types are wrong results inside a deterministic computation, and the other machine never fails. Together these make a CPU fault the clear explanation.

Files:
- `start-probe-vm-turbo-on.jsonl.gz` and `start-probe-vm-turbo-off.jsonl.gz`: one record per start, with the error output of every failure.

## What this means for the results

- **Hardhat.** A wrong computation could, in principle, change a result without crashing. Recorded Hardhat results are therefore accepted only after a replay on other hardware (`tools/replay-check.mjs`). So far all 30 replayed cells are identical. The full set is replayed at the results freeze (CP4).
- **Besu.** Runs on the same host, so Besu runs are not replayed on other hardware. The 12 controlled Besu runs matched Hardhat, and the three R0 differences have a traced cause (E8).
- **Until the CPU is replaced,** turbo stays off on the host and every run is recorded with it off. Since 2026-11-05 about 14:00 UTC, this is enforced at boot by `no-turbo.service` on the host, which writes 1 to `/sys/devices/system/cpu/intel_pstate/no_turbo`.
