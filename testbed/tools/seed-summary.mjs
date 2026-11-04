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

// Exact two-sided Wilcoxon signed-rank test: zero differences dropped, average ranks for ties, exact null
// distribution by enumerating sign assignments (counted with a subset-sum table on doubled ranks).
const wilcoxon = d => {
  const nz = d.filter(x => x !== 0), n = nz.length;
  if (!n) return null;
  const order = nz.map((x, i) => ({ a: Math.abs(x), i })).sort((p, q) => p.a - q.a), rank = new Array(n);
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && order[j + 1].a === order[i].a) j++; for (let k = i; k <= j; k++) rank[order[k].i] = i + j + 2; i = j + 1; }
  const wPlus = nz.reduce((p, x, i) => p + (x > 0 ? rank[i] : 0), 0), total = rank.reduce((p, r) => p + r, 0);
  let counts = new Map([[0, 1]]);
  for (const r of rank) { const next = new Map(counts); for (const [s, c] of counts) next.set(s + r, (next.get(s + r) || 0) + c); counts = next; }
  const lo = Math.min(wPlus, total - wPlus); let tail = 0;
  for (const [s, c] of counts) if (s <= lo) tail += c;
  return { n, p: Math.min(1, 2 * tail / 2 ** n) };
};
const cell = new Map([...done.values()].map(a => [`${a.run.spec}|${a.run.seed}`, a.r]));
const attackers = [...new Set(specs.map(sp => sp.split("-")[1]))].sort();
const contrasts = [["R0", "R1"], ["R0", "R2"], ["R0", "R3"], ["R0", "R4"], ["R1", "R4"], ["R2", "R4"], ["R3", "R4"]];
console.log("\n| Contrast (loss) | Seeds paired | Median reduction | Seeds with lower loss | Exact Wilcoxon p (two-sided) |");
console.log("|---|---|---|---|---|");
for (const A of attackers) for (const [x, y] of contrasts) {
  const seeds = [...new Set([...done.values()].map(a => a.run.seed))].sort((p, q) => p - q)
    .filter(s => cell.has(`${x}-${A}|${s}`) && cell.has(`${y}-${A}|${s}`));
  if (!seeds.length) continue;
  const d = seeds.map(s => cell.get(`${x}-${A}|${s}`).lossUsd - cell.get(`${y}-${A}|${s}`).lossUsd), w = wilcoxon(d);
  console.log(`| ${x}-${A} → ${y}-${A} | ${seeds.length} | ${usd(median(d))} | ${d.filter(v => v > 0).length} of ${seeds.length} | ${w ? (w.p < 0.001 ? w.p.toExponential(1) : w.p.toFixed(4)) + (w.n < seeds.length ? ` (${seeds.length - w.n} ties dropped)` : "") : "identical at every seed"} |`);
}

const failed = attempts.filter(a => a.run.status !== "done");
console.log(`\nAttempts: ${attempts.length} (${attempts.length - failed.length} completed, ${failed.length} not completed).`);
for (const a of failed) {
  const secs = (Date.parse(a.run.finishedAt) - Date.parse(a.run.startedAt)) / 1000;
  console.log(`- ${a.run.id}: ${a.run.status}, exit code ${a.run.exitCode ?? "none"}, signal ${a.run.signal ?? "none"}, after ${secs.toFixed(1)} s`);
}
console.log(`Same (spec, seed) completed in more than one bundle: ${reproduced} identical, ${mismatches.length} different${mismatches.length ? ` (${mismatches.join("; ")})` : ""}.`);
if (mismatches.length) process.exitCode = 1;
