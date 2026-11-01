// Reproducible candidate selection from a DeFiLlama hacks snapshot.
//   node select.mjs [data/defillama-hacks-<date>.json]
// Writes candidates.csv: every dataset entry >= $10M since 2014 that may fall in U1/U2/U3, with its status
// in this catalog (verified incident file, excluded with reason, or pending). Nothing is dropped silently.
import fs from "node:fs";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const snap = process.argv[2] || fs.readdirSync(path.join(here, "data")).filter(f => f.startsWith("defillama-hacks-")).sort().pop();
const data = JSON.parse(fs.readFileSync(path.resolve(here, snap.includes("/") ? snap : path.join("data", snap)), "utf8"));
const U1T = new Set(["CEX", "Wallet", "Payments", "Crypto Card"]);
const SIGN = new Set(["Key Compromise", "Social Engineering", "Frontend & Infrastructure"]);
const REVIEW_T = new Set(["Other", "Gambling Platform", "Foundation", "DAO", "Chain", "Layer 1"]);
const iso = t => new Date(t * 1000).toISOString().slice(0, 10);
const key = (name, date) => `${name}|${date}`;

// Links from dataset entries to catalog decisions (maintained by hand, reviewed in git).
const map = JSON.parse(fs.readFileSync(path.join(here, "map.json"), "utf8"));
const excluded = new Map(fs.readFileSync(path.join(here, "excluded.csv"), "utf8").trim().split("\n").slice(1)
  .map(l => l.match(/^"?([^"]*?)"?,(\d{4}-\d{2}-\d{2}),(.*)$/)).filter(Boolean).map(m => [key(m[1], m[2]), m[3]]));
const incidentIds = new Set(fs.readdirSync(path.join(here, "incidents")).map(f => f.replace(/\.md$/, "")));

const rows = [];
for (const x of data) {
  const amount = x.amount || 0, date = iso(x.date);
  if (amount < 10_000_000 || date < "2014-01-01") continue;
  let u = U1T.has(x.targetType) ? "U1" : x.bridgeHack ? "U2" : SIGN.has(x.classification) ? "U3"
    : (x.classification === "Access Control" || REVIEW_T.has(x.targetType)) ? "review" : null;
  if (!u) continue;
  const k = key(x.name, date), id = map[k];
  let status = "pending", note = "";
  if (id) { status = incidentIds.has(id) ? "verified" : "mapped-missing-file"; note = id; }
  else if (excluded.has(k)) { status = "excluded"; note = excluded.get(k); }
  rows.push({ date, name: x.name, amount, targetType: x.targetType, classification: x.classification, technique: x.technique,
    bridgeHack: x.bridgeHack, tentative_universe: u, status, note });
}
rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
const cols = ["date", "name", "amount", "targetType", "classification", "technique", "bridgeHack", "tentative_universe", "status", "note"];
const esc = v => v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
fs.writeFileSync(path.join(here, "candidates.csv"), [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n") + "\n");
const count = f => rows.reduce((o, r) => (o[r[f]] = (o[r[f]] || 0) + 1, o), {});
console.log(`snapshot ${snap}: ${data.length} entries -> ${rows.length} candidates`);
console.log("by universe", JSON.stringify(count("tentative_universe")), "| by status", JSON.stringify(count("status")));
const missing = rows.filter(r => r.status === "mapped-missing-file"); if (missing.length) { console.error("mapped ids without incident file:", missing.map(r => r.note)); process.exit(1); }
const extra = Object.values(map).filter(id => !rows.some(r => r.note === id)); if (extra.length) { console.error("map ids not matched in snapshot:", extra); process.exit(1); }
