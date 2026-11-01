// Builds incidents.csv from incidents/*.md front matter and checks the catalog rules.
// Usage: node build.mjs        (exits non-zero if a rule is violated)
import fs from "node:fs";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const FIELDS = ["id", "date", "victim", "universe", "loss_usd", "loss_usd_range", "chains", "access", "authorization",
  "detection", "response", "ibs_status", "ibs_controls", "ibs_note", "attacker_model", "evidence", "disputed"];
const AUTH = ["key-theft", "account-takeover", "signing-request-manipulation", "blind-signing", "validator-key-compromise", "contract-bug", "insider", "unknown"];
const STATUS = ["evaluated", "out-of-scope", "insufficient-evidence", "disputed", "pending"];
const problems = [];
const rows = [];
for (const f of fs.readdirSync(path.join(here, "incidents")).filter(f => f.endsWith(".md")).sort()) {
  const text = fs.readFileSync(path.join(here, "incidents", f), "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { problems.push(`${f}: no front matter`); continue; }
  const r = {};
  for (const line of m[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) r[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  if (`${r.id}.md` !== f) problems.push(`${f}: id must match file name`);
  if (!AUTH.includes(r.authorization)) problems.push(`${f}: authorization must be one of ${AUTH.join(", ")}`);
  if (!STATUS.includes(r.ibs_status)) problems.push(`${f}: ibs_status must be one of ${STATUS.join(", ")}`);
  if (!/^U[123]$/.test(r.universe || "")) problems.push(`${f}: universe must be U1, U2 or U3`);
  if (Number(r.loss_usd) < 10_000_000 && !r.below_threshold_reason) problems.push(`${f}: below $10M needs below_threshold_reason`);
  const srcCount = (text.split(/^## Sources/m)[1] || "").split("\n").filter(l => /^\s*[-*] .*https?:\/\//.test(l)).length;
  if (r.evidence === "two-source" && srcCount < 2) problems.push(`${f}: evidence two-source but ${srcCount} source URL(s) listed`);
  r.sources = `incidents/${f}`;
  rows.push(r);
}
rows.sort((a, b) => a.date.localeCompare(b.date));
const esc = v => v === undefined ? "" : /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
fs.writeFileSync(path.join(here, "incidents.csv"), [[...FIELDS, "sources"].join(","), ...rows.map(r => [...FIELDS, "sources"].map(k => esc(r[k])).join(","))].join("\n") + "\n");
const by = k => rows.reduce((o, r) => (o[r[k]] = (o[r[k]] || 0) + 1, o), {});
console.log(`${rows.length} incidents | status ${JSON.stringify(by("ibs_status"))} | authorization ${JSON.stringify(by("authorization"))}`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
