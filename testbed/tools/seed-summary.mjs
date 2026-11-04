// Seed-variance summary for one or more result bundles (campaign + runs, as stored in testbed/results/*/ *.json.gz).
// Usage: node tools/seed-summary.mjs <bundle.json.gz> [more bundles ...]
// Prints a markdown table per run spec (losses across seeds: median, range and a 95% bootstrap CI of the median, as in
// docs/RESEARCH_FRAMING.md §7; benign withdrawals,
// first alert, detect/contain step), lists every failed attempt, and checks that a (spec, seed) pair that
// completed in more than one bundle produced the same result. The bootstrap uses a fixed PRNG seed, so the output
// is identical on every machine.
import fs from "node:fs";
import zlib from "node:zlib";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node tools/seed-summary.mjs <bundle.json.gz> ..."); process.exit(2); }

const attempts = [];
for (const f of files) {
  const b = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString("utf8"));
  for (const { run, result } of b.runs) attempts.push({ file: f, run, r: result?.results?.[0] ?? null });
}

// Same seed, same commit -> same outcome. Compare everything except wall-clock fields.
const strip = r => JSON.stringify(r, (k, v) => (k === "runtimeSec" || k === "timing" ? undefined : v));
const done = new Map(); const mismatches = []; let reproduced = 0;
for (const a of attempts) {
  if (a.run.status !== "done" || !a.r) continue;
  const key = `${a.run.spec}|${a.run.seed}`;
  const prev = done.get(key);
  if (!prev) { done.set(key, a); continue; }
  if (prev.run.provenance?.simSha256 !== a.run.provenance?.simSha256) continue;
  if (strip(prev.r) === strip(a.r)) reproduced++; else mismatches.push(key);
}

let s = 0x1d1b1a5;
const rand = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const median = xs => { const v = [...xs].sort((p, q) => p - q), h = v.length >> 1; return v.length % 2 ? v.at(h) : (v.at(h - 1) + v.at(h)) / 2; };
const bootCI = (xs, B = 10000) => {
  const ms = [];
  for (let i = 0; i < B; i++) ms.push(median(Array.from(xs, () => xs.at(Math.floor(rand() * xs.length)))));
  ms.sort((p, q) => p - q);
  return [ms.at(Math.floor(0.025 * B)), ms.at(Math.ceil(0.975 * B) - 1)];
};
const usd = x => `$${(x / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
const order = sp => sp.replace(/^R(\d+)(\w*)-A(\d+)(\w*)$/, (m, c, cs, a, as) => `${c.padStart(2, "0")}${cs}-${a.padStart(2, "0")}${as}`);

const specs = [...new Set([...done.values()].map(a => a.run.spec))].sort((p, q) => order(p).localeCompare(order(q)));
console.log("| Run | Seeds | Median loss | Min – max | 95% CI of median | Spread | Benign landed (min – max) | First alert | Detect / contain step |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const sp of specs) {
  const g = [...done.values()].filter(a => a.run.spec === sp).sort((p, q) => p.run.seed - q.run.seed);
  const L = g.map(a => a.r.lossUsd), m = median(L), [lo, hi] = bootCI(L);
  const land = g.map(a => a.r.benignLanded?.success ?? 0);
  const fa = [...new Set(g.map(a => a.r.firstAlert ?? "—"))].join(", ");
  const dc = [...new Set(g.map(a => `${a.r.detectT ?? "—"} / ${a.r.containT ?? "—"}`))].join(", ");
  const spread = m ? `${((Math.max(...L) - Math.min(...L)) / m * 100).toFixed(2)}% of median` : "0";
  console.log(`| ${sp} | ${g.map(a => a.run.seed).join(", ")} | ${usd(m)} | ${usd(Math.min(...L))} – ${usd(Math.max(...L))} | ${usd(lo)} – ${usd(hi)} | ${spread} | ${Math.min(...land)} – ${Math.max(...land)} | ${fa} | ${dc} |`);
}

const failed = attempts.filter(a => a.run.status !== "done");
console.log(`\nAttempts: ${attempts.length} (${attempts.length - failed.length} completed, ${failed.length} not completed).`);
for (const a of failed) {
  const secs = (Date.parse(a.run.finishedAt) - Date.parse(a.run.startedAt)) / 1000;
  console.log(`- ${a.run.id}: ${a.run.status}, exit code ${a.run.exitCode ?? "none"}, signal ${a.run.signal ?? "none"}, after ${secs.toFixed(1)} s`);
}
console.log(`Same (spec, seed) completed in more than one bundle: ${reproduced} identical, ${mismatches.length} different${mismatches.length ? ` (${mismatches.join("; ")})` : ""}.`);
if (mismatches.length) process.exitCode = 1;
