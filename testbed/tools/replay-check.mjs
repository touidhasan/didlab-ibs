// Cross-machine replay check. Reruns completed Hardhat cells from result bundles on this machine and checks that
// each result is identical to the recorded one, apart from wall-clock fields (runtimeSec, timing). Hardhat runs
// are deterministic for a given simulator and seed, so any difference means the recording machine, this machine
// or the code differs. Used to show that results recorded on the research VM do not depend on that VM
// (limitation E14: its CPU produces start-up crashes).
//
// Usage, from testbed/:
//   node tools/replay-check.mjs [--seeds 7,12] [--specs R0-A1,R4-A3] [--current] <bundle.json.gz> [more bundles ...]
// Cells come from the bundles (first completed attempt per spec and seed). Exit code 1 if any cell differs.
// Each cell runs with the simulator it was recorded with: when sim.mjs has changed since, the recorded commit's
// testbed/ is extracted from git into a scratch folder and its sim.mjs hash is checked against the recording.
// --current runs today's sim.mjs instead, to show that a code change leaves recorded results unchanged.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2), opt = {};
while (args[0]?.startsWith("--")) { const k = args.shift().slice(2); opt[k] = k === "current" ? true : args.shift().split(","); }
if (!args.length) { console.error("usage: node tools/replay-check.mjs [--seeds 7,12] [--specs R0-A1] <bundle.json.gz> ..."); process.exit(2); }

const testbed = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shaOf = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const simSha = shaOf(path.join(testbed, "sim.mjs"));
const strip = r => JSON.stringify(r, (k, v) => (k === "runtimeSec" || k === "timing" ? undefined : v));

const cells = new Map();
for (const f of args) {
  const b = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString("utf8"));
  for (const { run, result } of b.runs) {
    if (run.status !== "done" || run.backend !== "hardhat" || !result?.results?.[0]) continue;
    if (opt.seeds && !opt.seeds.includes(String(run.seed))) continue;
    if (opt.specs && !opt.specs.includes(run.spec)) continue;
    const key = `${run.spec}|${run.seed}`;
    if (!cells.has(key)) cells.set(key, { run, recorded: result.results[0] });
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ibs-replay-"));
// A testbed/ that runs the given simulator: this one, or the recorded commit's, extracted once per commit.
const trees = new Map();
function treeFor(run) {
  if (opt.current || run.provenance?.simSha256 === simSha) return testbed;
  const commit = run.provenance?.gitCommit;
  if (!commit) return null;
  if (!trees.has(commit)) {
    const dir = path.join(tmp, `tree-${commit.slice(0, 12)}`); fs.mkdirSync(dir);
    const root = spawnSync("git", ["-C", testbed, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim();
    const ar = spawnSync("sh", ["-c", `git -C "${root}" archive "${commit}" testbed | tar -x -C "${dir}"`], { encoding: "utf8" });
    const tb = path.join(dir, "testbed");
    if (ar.status !== 0 || !fs.existsSync(path.join(tb, "sim.mjs"))) trees.set(commit, null);
    else { fs.symlinkSync(path.join(testbed, "node_modules"), path.join(tb, "node_modules")); trees.set(commit, tb); }
  }
  const tb = trees.get(commit);
  return tb && shaOf(path.join(tb, "sim.mjs")) === run.provenance?.simSha256 ? tb : null;
}
console.log(`replay-check: ${cells.size} cells, node ${process.version}, cpu ${os.cpus()[0]?.model}, ${opt.current ? `current sim.mjs ${simSha.slice(0, 12)} for every cell` : "each cell with its recorded sim.mjs"}`);
let same = 0, diff = 0, skipped = 0;
for (const { run, recorded } of cells.values()) {
  const tag = `${run.spec} s${run.seed}`;
  const tb = treeFor(run);
  if (!tb) { console.log(`  ${tag}: skipped (sim.mjs ${String(run.provenance?.simSha256).slice(0, 12)} of commit ${String(run.provenance?.gitCommit).slice(0, 7)} not available)`); skipped++; continue; }
  const out = path.join(tmp, `${run.spec}-s${run.seed}.json`);
  const env = { ...process.env, BACKEND: "hardhat", HORIZON: String(run.horizon), SEEDS: String(run.seed), OUT: out, ...(run.trace ? { TRACE: "1" } : {}) };
  if (!run.trace) delete env.TRACE;
  delete env.RPC;
  const t0 = Date.now();
  const p = spawnSync(process.execPath, ["sim.mjs", `=${run.spec}`], { cwd: tb, env, encoding: "utf8", maxBuffer: 64 << 20 });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  let replayed = null; try { replayed = JSON.parse(fs.readFileSync(out, "utf8")).results[0]; } catch {}
  if (!replayed) { console.log(`  ${tag}: replay failed (exit ${p.status}, signal ${p.signal})`); diff++; continue; }
  if (strip(replayed) === strip(recorded)) { same++; console.log(`  ${tag}: identical (${secs} s)`); }
  else { diff++; console.log(`  ${tag}: DIFFERENT — recorded loss ${recorded.lossUsd}, replayed ${replayed.lossUsd}`); }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`replay-check: ${same} identical, ${diff} different, ${skipped} skipped`);
if (diff) process.exitCode = 1;
