// Rebuilds every results table and figure from the committed results, and checks the claims they support.
//
//   node testbed/tools/rebuild.mjs            (from the repo root; writes build/, which git ignores)
//
// Inputs: the dashboard CSV exports under testbed/results/ (listed in SOURCES). Outputs:
//   build/tables/*.md   tables for the papers, each with its source files
//   build/figures/*.svg figures (static SVG, light theme; hover a mark for its values)
//   build/checks.txt    every check with PASS or FAIL. The command exits 1 if any check fails.
// No dependencies beyond Node. Nothing here reruns the simulator.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const RES = path.join(ROOT, "testbed/results");
const OUT = path.join(ROOT, "build");
const SOURCES = {
  hardhat: ["2026-11-14-hardhat-full-10seeds/hardhat-s7-11.csv", "2026-11-14-hardhat-full-10seeds/hardhat-s12-16.csv"],
  sweeps: ["2026-11-15-sweeps-10seeds/hardhat-s7-11.csv", "2026-11-15-sweeps-10seeds/hardhat-s12-16.csv"],
  besuCore: ["2026-11-13-besu-core-5seeds/besu-s7-11.csv"],
  besuNew: ["2026-11-06-mempool-attackers/besu-s7.csv", "2026-11-06-mempool-attackers/besu-s7-R0-A3r-fixed.csv", "2026-11-10-a5-a8/besu-s7.csv"],
};
const SEEDS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const M = 1e6, H = 1200;

// ---------- data ----------
function readCsv(rel) {
  const [head, ...lines] = fs.readFileSync(path.join(RES, rel), "utf8").trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.map(l => { const v = l.split(","); return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ""])); });
}
// Later files win, so a rerun listed after its campaign replaces the original run.
function load(files) {
  const by = new Map();
  for (const f of files) for (const r of readCsv(f)) if (r.status === "done") by.set(`${r.spec}|${r.seed}`, r);
  return by;
}
const HH = load([...SOURCES.hardhat, ...SOURCES.sweeps]);
const BESU = load([...SOURCES.besuCore, ...SOURCES.besuNew]);
const get = (db, spec, seed) => db.get(`${spec}|${seed}`);
const loss = r => Number(r.lossUsd);
const specs = db => [...new Set([...db.values()].map(r => r.spec))];

// Parameters of a configuration, from its name: base R0..R4 (+ t, p, h) and an optional sweep tag.
const TAGS = { B10: { B: 10 * M }, B50: { B: 50 * M }, T150: { T: 150 }, T600: { T: 600 }, n2: { nu: 2 }, n8: { nu: 8 }, b05: { b: 0.5 * M }, b2: { b: 2 * M } };
function params(cfg) {
  const [base, tag] = cfg.split("_");
  const budgets = /^R[134]/.test(base);
  return { base, tag: tag || "", budgets, watcher: /^R[234]/.test(base), semantic: /^R[134]/.test(base),
    earlyUnfreeze: base.endsWith("p"), fix: base.endsWith("h"), B: 25 * M, T: 300, nu: 4, b: 1 * M, ...(TAGS[tag] || {}) };
}
const IA_COMPROMISED = new Set(["A4", "A5i", "A8i", "A10i"]);

// ---------- statistics ----------
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
// Exact two-sided Wilcoxon signed-rank test on paired differences (zeros dropped, average ranks for ties).
function wilcoxon(d) {
  const x = d.filter(v => v !== 0), n = x.length;
  if (!n) return null;
  const idx = x.map((v, i) => i).sort((a, b) => Math.abs(x[a]) - Math.abs(x[b])), rank = new Array(n);
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && Math.abs(x[idx[j + 1]]) === Math.abs(x[idx[i]])) j++; for (let k = i; k <= j; k++) rank[idx[k]] = (i + j) / 2 + 1; i = j + 1; }
  const tot = rank.reduce((s, r) => s + r, 0), wPlus = x.reduce((s, v, i) => s + (v > 0 ? rank[i] : 0), 0), obs = Math.min(wPlus, tot - wPlus);
  let hits = 0;
  for (let m = 0; m < 1 << n; m++) { let w = 0; for (let i = 0; i < n; i++) if (m & (1 << i)) w += rank[i]; if (Math.min(w, tot - w) <= obs + 1e-9) hits++; }
  return hits / 2 ** n;
}
const fmtM = v => (v / M).toFixed(2);
const fmtRange = vs => `${fmtM(median(vs))} (${fmtM(Math.min(...vs))}–${fmtM(Math.max(...vs))})`;
const fmtP = p => (p === null ? "identical" : p < 0.01 ? p.toFixed(3) : p.toFixed(4));

// ---------- checks ----------
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

// 1. Bounds, every Hardhat run.
{
  let multi = 0, single = 0, fixB = 0; const bad = [];
  for (const r of HH.values()) {
    const [cfg, atk] = r.spec.split("-"), p = params(cfg), L = loss(r);
    if (!p.budgets) continue;
    const mw = p.B * Math.ceil(H / p.T);
    multi++; if (L > mw) bad.push(`${r.spec} s${r.seed}: ${fmtM(L)} > multi-window ${fmtM(mw)}`);
    if (p.watcher && p.semantic && !p.earlyUnfreeze && atk !== "benign" && !IA_COMPROMISED.has(atk)) {
      const W = atk === "A5" ? 4 : 3, si = p.fix ? p.B : p.B + W * p.nu * p.b;
      single++; if (p.fix) fixB++;
      if (L > si) bad.push(`${r.spec} s${r.seed}: ${fmtM(L)} > single-incident ${fmtM(si)}`);
    }
  }
  check("T3 bounds hold in every Hardhat run", bad.length === 0,
    `${multi} runs against B*ceil(H/T); ${single} contained runs against B + W*nu*b (B for the ${fixB} runs with the fix)` + (bad.length ? `; violations: ${bad.join("; ")}` : ""));
}
// 2. No benign run raises an alert.
{
  const ben = [...HH.values()].filter(r => r.spec.endsWith("-benign"));
  const bad = ben.filter(r => r.firstAlert || Number(r.falseAlerts) > 0 || Number(r.alertsDuringAttack) > 0);
  check("No false alarm in any benign run", bad.length === 0, `${ben.length} benign runs` + (bad.length ? `; alarms: ${bad.map(r => `${r.spec} s${r.seed}`).join(", ")}` : ""));
}
// 3. Besu equals Hardhat wherever a signing policy is on (core 15, seeds 7-11), plus R2-A1.
{
  const cmp = [...BESU.values()].filter(r => /^R[134]-A[123]$|^R2-A1$/.test(r.spec) && Number(r.seed) <= 11);
  const bad = cmp.filter(r => { const h = get(HH, r.spec, r.seed); return !h || loss(h) !== loss(r) || h.benignSent !== r.benignSent || h.alertsDuringAttack !== r.alertsDuringAttack; });
  check("Besu equals Hardhat for R1, R3, R4 and R2-A1 (core attackers, seeds 7-11)", bad.length === 0 && cmp.length === 50,
    `${cmp.length} runs compared on loss, customers completed and alerts` + (bad.length ? `; differ: ${bad.map(r => `${r.spec} s${r.seed}`).join(", ")}` : ""));
}
// 4. The hoarding fix: lower at every seed, within B everywhere, and the old claim fails somewhere.
{
  const tags = ["", ...Object.keys(TAGS)];
  let lower = 0, higher = 0, total = 0, over = 0;
  for (const t of tags) for (const s of SEEDS) {
    const a = get(HH, `R3${t && "_" + t}-A10`, s), h = get(HH, `R3h${t && "_" + t}-A10`, s);
    if (!a || !h) continue;
    total++; if (loss(h) < loss(a)) lower++; if (loss(h) > loss(a)) higher++;
    if (loss(a) > params(`R3${t && "_" + t}`).B) over++;
  }
  check("Without the fix, A10 exceeds B in at least one run (the old claim fails)", over > 0, `${over} of ${total} R3-A10 runs exceed B`);
  check("With the fix, A10 never loses more than without it", higher === 0, `${lower} of ${total} pairs lower, ${total - lower - higher} equal, ${higher} higher`);
}
// 5. Every expected run is present.
{
  const missing = [];
  for (const sp of specs(HH)) for (const s of SEEDS) if (!get(HH, sp, s)) missing.push(`${sp} s${s}`);
  check("Every Hardhat run has all 10 seeds", missing.length === 0, `${specs(HH).length} runs × 10 seeds` + (missing.length ? `; missing: ${missing.slice(0, 20).join(", ")}` : ""));
}

// ---------- tables ----------
const tables = {};
const src = keys => `Source: ${keys.flatMap(k => SOURCES[k]).map(f => "`testbed/results/" + f + "`").join(", ")}.`;
function mdTable(head, rows) { return [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map(r => `| ${r.join(" | ")} |`)].join("\n"); }
const lossesOf = (db, spec) => SEEDS.map(s => get(db, spec, s)).filter(Boolean).map(loss);

// Core matrix, Hardhat, 10 seeds.
{
  const rows = ["R0", "R1", "R2", "R3", "R4"].map(c => [c, ...["A1", "A2", "A3"].map(a => fmtRange(lossesOf(HH, `${c}-${a}`)))]);
  tables["core-hardhat"] = `# Loss by configuration and attacker, Hardhat, seeds 7–16\n\nUSD millions: median (range over 10 seeds).\n\n${mdTable(["Configuration", "A1", "A2", "A3"], rows)}\n\n${src(["hardhat"])}\n`;
}
// Every run in the plan, Hardhat, 10 seeds.
{
  const rows = specs(HH).filter(sp => !sp.includes("_")).map(sp => {
    const rs = SEEDS.map(s => get(HH, sp, s));
    return [sp, fmtRange(rs.map(loss)), median(rs.map(r => Number(r.alertsDuringAttack))), median(rs.map(r => Number(r.benignSent))), median(rs.map(r => Number(r.benignBlocked)))];
  });
  tables["all-runs-hardhat"] = `# Every run in the plan, Hardhat, seeds 7–16\n\nLoss in USD millions, median (range); the other columns are medians.\n\n${mdTable(["Run", "Loss", "Alerts during attack", "Customer withdrawals completed", "Blocked"], rows)}\n\n${src(["hardhat"])}\n`;
}
// Besu minus Hardhat, core 15, seeds 7-11.
{
  const rows = ["R0", "R1", "R2", "R3", "R4"].flatMap(c => ["A1", "A2", "A3"].map(a => {
    const sp = `${c}-${a}`;
    return [sp, ...[7, 8, 9, 10, 11].map(s => { const b = get(BESU, sp, s), h = get(HH, sp, s); if (!b || !h) return "–"; const d = loss(b) - loss(h); return d === 0 ? "0" : fmtM(d); })];
  }));
  tables["besu-vs-hardhat"] = `# Besu minus Hardhat, core runs, seeds 7–11\n\nLoss difference in USD millions. "0" means equal to the dollar; "0.00" means within USD 5,000.\n\n${mdTable(["Run", "s7", "s8", "s9", "s10", "s11"], rows)}\n\n${src(["besuCore", "hardhat"])}\n`;
}
// Newer attackers at seed 7 on both clients.
{
  const sp = [...BESU.values()].filter(r => r.seed === "7" && /A3r|A9|A5|A8/.test(r.spec)).map(r => r.spec);
  const rows = [...new Set(sp)].sort().map(s => { const b = get(BESU, s, 7), h = get(HH, s, 7); return [s, fmtM(loss(h)), fmtM(loss(b)), loss(b) === loss(h) ? "equal" : fmtM(loss(b) - loss(h))]; });
  tables["newer-attackers-besu"] = `# Newer attackers on both clients, seed 7\n\nUSD millions. "equal" means equal to the dollar; "0.00" means within USD 5,000. R0-A3r is the fixed attacker's rerun.\n\n${mdTable(["Run", "Hardhat", "Besu", "Besu − Hardhat"], rows)}\n\n${src(["besuNew", "hardhat"])}\n`;
}
// Sweeps.
const SWEEP_ROWS = [["", "defaults"], ["B10", "B = 10M"], ["B50", "B = 50M"], ["T150", "T = 150"], ["T600", "T = 600"], ["n2", "ν = 2"], ["n8", "ν = 8"], ["b05", "b = 0.5M"], ["b2", "b = 2M"]];
const sweepSpec = (cfg, tag, a) => `${cfg}${tag && "_" + tag}-${a}`;
{
  const cells = [["R1", "A3"], ["R1", "A8"], ["R3", "A3"], ["R3", "A10"], ["R3h", "A10"], ["R4", "A4"]];
  const rows = SWEEP_ROWS.map(([tag, label]) => {
    const p = params(`R3${tag && "_" + tag}`);
    return [`${label} (${fmtM(p.B * Math.ceil(H / p.T))} / ${fmtM(p.B + 3 * p.nu * p.b)})`, ...cells.map(([c, a]) => fmtRange(lossesOf(HH, sweepSpec(c, tag, a))))];
  });
  tables["sweeps"] = `# Parameter sweeps, Hardhat, seeds 7–16\n\nUSD millions: median (range). In brackets after each setting: the multi-window bound B⌈H/T⌉ / the single-incident bound B + Wνb.\n\n${mdTable(["Setting", ...cells.map(([c, a]) => `${c}-${a}`)], rows)}\n\n${src(["sweeps", "hardhat"])}\n`;
}
// Paired contrasts.
{
  const pairs = [["R3h-A10", "R3-A10"], ["R4h-A10i", "R4-A10i"], ["R3h-A3", "R3-A3"], ["R4h-benign", "R4-benign"], ["R1-A8", "R1-A3"], ["R4-A8i", "R1-A8"], ["R3-A3", "R1-A3"], ["R4-A3", "R3-A3"], ["R3-A2", "R2-A2"]];
  for (const [tag] of SWEEP_ROWS.slice(1)) pairs.push([sweepSpec("R3h", tag, "A10"), sweepSpec("R3", tag, "A10")]);
  const rows = pairs.map(([a, b]) => {
    const d = SEEDS.map(s => loss(get(HH, a, s)) - loss(get(HH, b, s)));
    return [`${a} − ${b}`, fmtM(median(d)), `${fmtM(Math.min(...d))} to ${fmtM(Math.max(...d))}`, d.filter(x => x < 0).length + " / " + d.filter(x => x > 0).length, fmtP(wilcoxon(d))];
  });
  tables["contrasts"] = `# Paired contrasts over seeds 7–16 (Hardhat)\n\nLoss difference in USD millions. Exact Wilcoxon signed-rank test, two-sided; with 10 seeds the smallest possible p is 0.002.\n\n${mdTable(["Contrast", "Median difference", "Range", "Seeds lower / higher", "p"], rows)}\n\n${src(["hardhat", "sweeps"])}\n`;
}

// ---------- figures ----------
const C = { surface: "#fcfcfb", ink: "#0b0b0b", ink2: "#52514e", muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7", s1: "#2a78d6", s2: "#eb6834" };
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Dot-and-range chart: per category, each series shows its median (dot) and its range over seeds (line).
function rangeDots({ title, yLabel, categories, series, yMax, ref }) {
  const w = 720, h = 360, m = { l: 64, r: 24, t: 56, b: 56 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = i => m.l + (i + 0.5) * (iw / categories.length), y = v => m.t + ih - (v / yMax) * ih;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="12">`,
    `<title>${esc(title)}</title>`, `<rect width="${w}" height="${h}" fill="${C.surface}"/>`,
    `<text x="${m.l}" y="22" font-size="14" font-weight="600" fill="${C.ink}">${esc(title)}</text>`];
  const step = yMax <= 1.5 ? 0.25 : yMax / 5;
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    out.push(`<line x1="${m.l}" x2="${m.l + iw}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? C.axis : C.grid}" stroke-width="1"/>`);
    out.push(`<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="${C.muted}">${+v.toFixed(2)}</text>`);
  }
  out.push(`<text transform="translate(16 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle" fill="${C.ink2}">${esc(yLabel)}</text>`);
  if (ref) out.push(`<line x1="${m.l}" x2="${m.l + iw}" y1="${y(ref.value)}" y2="${y(ref.value)}" stroke="${C.ink2}" stroke-width="1.5"/>`,
    `<text x="${m.l + 6}" y="${y(ref.value) - 6}" fill="${C.ink2}">${esc(ref.label)}</text>`);
  categories.forEach((c, i) => out.push(`<text x="${x(i)}" y="${m.t + ih + 20}" text-anchor="middle" fill="${C.ink2}">${esc(c)}</text>`));
  const off = 9;
  series.forEach((s, k) => {
    const dx = (k - (series.length - 1) / 2) * off * 2;
    s.points.forEach((p, i) => {
      const cx = x(i) + dx;
      out.push(`<g><title>${esc(`${s.name}, ${categories[i]}: median ${p.med.toFixed(3)}, range ${p.min.toFixed(3)}–${p.max.toFixed(3)}${p.note ? " · " + p.note : ""}`)}</title>`,
        `<rect x="${cx - 8}" y="${y(p.max) - 8}" width="16" height="${y(p.min) - y(p.max) + 16}" fill="transparent"/>`,
        `<line x1="${cx}" x2="${cx}" y1="${y(p.min)}" y2="${y(p.max)}" stroke="${s.color}" stroke-width="2" stroke-linecap="round"/>`,
        `<circle cx="${cx}" cy="${y(p.med)}" r="4.5" fill="${s.color}" stroke="${C.surface}" stroke-width="2"/></g>`);
    });
  });
  let lx = m.l;
  series.forEach(s => { out.push(`<circle cx="${lx + 5}" cy="38" r="4.5" fill="${s.color}"/>`, `<text x="${lx + 14}" y="42" fill="${C.ink2}">${esc(s.name)}</text>`); lx += 24 + s.name.length * 6.6; });
  out.push(`<text x="${m.l}" y="${h - 12}" fill="${C.muted}">Dot: median over seeds 7–16. Line: range. Hover a mark for its values.</text>`, "</svg>");
  return out.join("\n");
}
const figures = {};
{
  const cats = SWEEP_ROWS.map(([, l]) => l), pts = cfg => SWEEP_ROWS.map(([tag]) => {
    const B = params(`R3${tag && "_" + tag}`).B, v = lossesOf(HH, sweepSpec(cfg, tag, "A10")).map(x => x / B);
    return { med: median(v), min: Math.min(...v), max: Math.max(...v), note: `${v.filter(r => r > 1).length} of 10 seeds above B` };
  });
  figures["hoarding-fix-sweep"] = rangeDots({ title: "Hoarding attacker A10: loss as a multiple of the budget B", yLabel: "Loss ÷ B", categories: cats, yMax: 1.25,
    ref: { value: 1, label: "B, the old single-incident claim" },
    series: [{ name: "R3, budget counted at signing", color: C.s1, points: pts("R3") }, { name: "R3h, counted until executed (fix)", color: C.s2, points: pts("R3h") }] });
  const pts2 = a => SWEEP_ROWS.map(([tag]) => {
    const p = params(`R1${tag && "_" + tag}`), bound = p.B * Math.ceil(H / p.T), v = lossesOf(HH, sweepSpec("R1", tag, a)).map(x => x / bound);
    return { med: median(v), min: Math.min(...v), max: Math.max(...v), note: `bound USD ${fmtM(bound)}M` };
  });
  figures["multi-window-tightness"] = rangeDots({ title: "Budgets alone (R1): loss as a multiple of the multi-window bound", yLabel: "Loss ÷ multi-window bound", categories: cats, yMax: 1.25,
    ref: { value: 1, label: "multi-window bound B·ceil(H/T)" },
    series: [{ name: "A3, plain drain", color: C.s1, points: pts2("A3") }, { name: "A8, drip (no alert)", color: C.s2, points: pts2("A8") }] });
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "tables"), { recursive: true });
fs.mkdirSync(path.join(OUT, "figures"), { recursive: true });
for (const [n, t] of Object.entries(tables)) fs.writeFileSync(path.join(OUT, "tables", n + ".md"), t);
for (const [n, f] of Object.entries(figures)) fs.writeFileSync(path.join(OUT, "figures", n + ".svg"), f + "\n");
const report = checks.map(c => `${c.ok ? "PASS" : "FAIL"}  ${c.name}\n      ${c.detail}`).join("\n");
fs.writeFileSync(path.join(OUT, "checks.txt"), report + "\n");
console.log(report);
console.log(`\n${Object.keys(tables).length} tables and ${Object.keys(figures).length} figures in ${path.relative(process.cwd(), OUT) || "."}/`);
process.exit(checks.every(c => c.ok) ? 0 : 1);
