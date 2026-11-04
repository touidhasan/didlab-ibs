// Start-up crash probe (limitation E14). Simulator runs have died from SIGSEGV, or from a V8 fatal error, within
// the first second, on a different cell each time. This probe starts short-lived Node processes over and over and
// counts how many die from a signal, for five kinds of start. The kinds are interleaved, so anything that varies
// over time affects them all equally:
//   bare     node -e 0                                Node itself
//   viem     import viem and build a client           the rpc backend's dependencies (pure JavaScript)
//   solc     import solc-js, read its version         the Solidity compiler, a large WebAssembly module that
//                                                     sim.mjs loads at start-up on both backends
//   hardhat  import hardhat, one eth_chainId          Hardhat and its native EDR module
//   sim      node sim.mjs --list with BACKEND=hardhat the simulator's own start-up, as the dashboard runs it
// The crashes so far (SIGSEGV; SIGABRT after "free(): invalid pointer"; a V8 fatal check) point at native memory
// corruption during start-up. Which kinds crash says where: solc and sim -> WebAssembly start-up; hardhat and sim ->
// Hardhat/EDR; bare too -> Node itself or the host.
//
// Usage, from testbed/:  N=300 OUT=$HOME/start-probe.jsonl node tools/start-probe.mjs
// One JSON line per start goes to OUT (keep it outside the repo); the summary line is printed and appended last.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const N = Number(process.env.N || 300);
const OUT = process.env.OUT || path.join(os.homedir(), `start-probe-${Date.now()}.jsonl`);
const testbed = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const flags = ["--report-on-fatalerror", `--report-directory=${path.dirname(OUT)}`];
const kinds = {
  bare: ["-e", "0"],
  viem: ["--input-type=module", "-e", "const { createPublicClient, http } = await import('viem'); createPublicClient({ transport: http('http://127.0.0.1:1') });"],
  solc: ["--input-type=module", "-e", "const solc = (await import('solc')).default; solc.version();"],
  hardhat: ["--input-type=module", "-e", "const hre = (await import('hardhat')).default; await hre.network.provider.request({ method: 'eth_chainId' });"],
  sim: ["sim.mjs", "--list"],
};
const stats = Object.fromEntries(Object.keys(kinds).map(k => [k, { starts: 0, signals: {}, nonzeroExits: 0, ms: [] }]));
const write = o => fs.appendFileSync(OUT, JSON.stringify(o) + "\n");
console.log(`start-probe: ${N} rounds x ${Object.keys(kinds).length} kinds, node ${process.version}, host ${os.hostname()}, writing ${OUT}`);

for (let i = 0; i < N; i++) {
  for (const [kind, args] of Object.entries(kinds)) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [...flags, ...args], { cwd: testbed, env: { ...process.env, BACKEND: "hardhat" }, encoding: "utf8", timeout: 120_000 });
    const ms = Date.now() - t0, s = stats[kind];
    s.starts++; s.ms.push(ms);
    if (r.signal) s.signals[r.signal] = (s.signals[r.signal] || 0) + 1;
    else if (r.status !== 0) s.nonzeroExits++;
    const rec = { t: new Date(t0).toISOString(), round: i, kind, ms, exitCode: r.status, signal: r.signal };
    if (r.signal || r.status !== 0) rec.stderrTail = (r.stderr || "").slice(-2000);
    write(rec);
    if (r.signal) console.log(`  ${rec.t} round ${i} ${kind}: killed by ${r.signal} after ${ms} ms`);
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${N} rounds`);
}

const median = xs => { const v = [...xs].sort((p, q) => p - q); return v.at(v.length >> 1); };
const summary = { summary: true, node: process.version, host: os.hostname(), cpu: os.cpus()[0]?.model, rounds: N,
  kinds: Object.fromEntries(Object.entries(stats).map(([k, s]) => [k, { starts: s.starts, signals: s.signals,
    crashes: Object.values(s.signals).reduce((p, x) => p + x, 0), nonzeroExits: s.nonzeroExits, medianMs: median(s.ms) }])) };
write(summary);
console.log(JSON.stringify(summary));
