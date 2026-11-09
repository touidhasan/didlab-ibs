// IBS experiment dashboard client. No build step, no external libraries.
const $ = sel => document.querySelector(sel);
const api = async (path, opts = {}) => {
  const r = await fetch(path, { ...opts, headers: { "content-type": "application/json", ...(opts.headers || {}) } });
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw Object.assign(new Error(body?.error || (body?.errors || []).join("; ") || r.statusText), { body });
  return body;
};
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") n.className = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined) n.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return n;
}
const SVGNS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => { const n = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const usdM = v => v === null || v === undefined ? "—" : `$${(v / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}M`;
const num = v => v === null || v === undefined ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const weiToEth = s => Number(BigInt(s) / 10n ** 15n) / 1000;
const ago = iso => { if (!iso) return "—"; const s = (Date.now() - Date.parse(iso)) / 1000; return s < 90 ? `${Math.round(s)} s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : new Date(iso).toLocaleString(); };
const SERIES = n => `var(--series-${(n % 8) + 1})`;
const statusChip = s => el("span", { class: `status ${s}` }, s);

const state = { catalog: null, campaigns: [], runs: [], selected: new Set(), detailId: null, tab: "campaigns", status: null };

// ---------- tabs ----------
function show(tab) {
  state.tab = tab;
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  for (const v of document.querySelectorAll(".view")) v.hidden = v.id !== `view-${tab}`;
  refresh();
}
for (const b of document.querySelectorAll(".tabs button")) b.addEventListener("click", () => show(b.dataset.tab));

// ---------- header ----------
async function refreshStatus() {
  try {
    const s = state.status = await api("api/status");
    const p = s.repo;
    $("#repo").replaceChildren(`commit ${p.gitCommit?.slice(0, 7) || "?"} (${p.gitBranch || "?"})`,
      p.gitDirty ? el("span", { class: "warn" }, " · uncommitted changes in testbed/research-net: results are not reproducible from a commit") : "");
    const c = s.chain, q = s.queue;
    const parts = [];
    if (c.ok) {
      parts.push(el("span", {}, el("span", { class: "status done" }, "chain"), " ", el("b", {}, c.chainId)));
      parts.push(el("span", {}, "block ", el("b", {}, c.block.toLocaleString())));
      parts.push(el("span", {}, "period ", el("b", {}, c.periodSec?.toFixed(2) ?? "—"), " s"));
      parts.push(el("span", {}, "last block ", el("b", {}, c.lastBlockAgeSec), " s ago"));
      if (c.peers !== null) parts.push(el("span", {}, "peers ", el("b", {}, c.peers)));
      if (c.txpool) parts.push(el("span", {}, "txpool ", el("b", {}, c.txpool.local + c.txpool.remote)));
      parts.push(el("span", { class: "muted" }, (c.client || "").split("/").slice(0, 2).join(" ")));
    } else parts.push(el("span", {}, el("span", { class: "status failed" }, "chain unreachable"), ` ${c.url} (${c.error}) — Hardhat campaigns still work`));
    parts.push(el("span", {}, "queue ", el("b", {}, `${q.running.length} running / ${q.queued} queued`), ` (max ${q.concurrency} at once)`));
    $("#health").replaceChildren(...parts);
  } catch (e) { $("#health").textContent = `dashboard server unreachable: ${e.message}`; }
}

// ---------- campaigns ----------
const CORE = ["R0", "R1", "R2", "R3", "R4"].flatMap(c => ["A1", "A2", "A3"].map(a => `${c}-${a}`));
const MEMPOOL = ["R0", "R1", "R2", "R3", "R4"].flatMap(c => ["A3r", "A9"].map(a => `${c}-${a}`)); // mempool-aware attackers
const CP3 = [...["R0", "R1", "R2", "R3", "R4"].flatMap(c => ["A5", "A8"].map(a => `${c}-${a}`)), "R4-A5i", "R4-A8i"]; // blind signing, drip
function buildPicker() {
  const box = $("#run-picker"); box.replaceChildren();
  for (const id of state.catalog.runs) box.append(el("label", { title: describe(id) }, el("input", { type: "checkbox", value: id }), id));
  box.addEventListener("change", estimate);
}
function describe(id) {
  const [c, a] = id.split("-");
  return `${state.catalog.configs[c] || c}\n${a === "benign" ? "No attacker (benign traffic only)" : state.catalog.attackers[a] || a}`;
}
for (const b of document.querySelectorAll("[data-sel]")) b.addEventListener("click", () => {
  const pick = { core: CORE, mempool: MEMPOOL, cp3: CP3 }[b.dataset.sel];
  for (const cb of document.querySelectorAll("#run-picker input")) cb.checked = b.dataset.sel === "all" || !!pick?.includes(cb.value);
  estimate();
});
const form = $("#new-campaign");
form.addEventListener("change", e => { if (e.target.name === "backend") $("#rpc-row").hidden = form.backend.value !== "rpc"; estimate(); });
form.addEventListener("input", estimate);
function formValues() {
  const runs = [...document.querySelectorAll("#run-picker input:checked")].map(i => i.value);
  const seeds = form.seeds.value.split(",").map(s => s.trim()).filter(Boolean).map(Number);
  return { name: form.name.value.trim(), note: form.note.value.trim(), backend: form.backend.value, rpc: form.rpc.value.trim() || undefined,
    runs, seeds, horizon: Number(form.horizon.value), trace: form.trace.checked };
}
function estimate() {
  const v = formValues(); const n = v.runs.length * v.seeds.length;
  const period = v.backend === "rpc" ? (state.status?.chain?.periodSec || 2) : null;
  let t = "";
  if (n && v.backend === "rpc") {
    const sec = n * ((v.horizon + 61 + 15) * period + 10) / (state.status?.queue?.concurrency || 1);
    t = ` · about ${sec > 5400 ? (sec / 3600).toFixed(1) + " h" : Math.round(sec / 60) + " min"} at ${period.toFixed(1)} s blocks (each step is one real block)`;
  } else if (n) t = " · Hardhat runs take seconds to about a minute each";
  $("#estimate").textContent = n ? `${n} run${n > 1 ? "s" : ""}${t}` : "Select at least one run.";
}
form.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("#form-msg");
  try {
    const c = await api("api/campaigns", { method: "POST", body: JSON.stringify(formValues()) });
    msg.className = "ok"; msg.textContent = `Queued ${c.runIds.length} run(s) as ${c.id}`;
    refresh();
  } catch (err) { msg.className = "warn"; msg.textContent = err.message; }
});
async function refreshCampaigns() {
  state.campaigns = await api("api/campaigns");
  const list = $("#campaign-list"); list.replaceChildren();
  if (!state.campaigns.length) list.append(el("p", { class: "muted" }, "No campaigns yet."));
  const sel = $("#run-filter"); const cur = sel.value;
  sel.replaceChildren(el("option", { value: "" }, "All campaigns"), ...state.campaigns.map(c => el("option", { value: c.id }, `${c.name} (${c.id})`)));
  sel.value = cur;
  for (const c of state.campaigns) {
    const n = c.runIds.length, k = c.counts;
    const seg = (s, color) => k[s] ? el("span", { style: `width:${(100 * k[s] / n).toFixed(2)}%;background:${color}`, title: `${k[s]} ${s}` }) : null;
    const active = (k.queued || 0) + (k.running || 0);
    list.append(el("div", { class: "item" },
      el("div", { class: "item-head" }, el("b", {}, c.name), el("span", { class: "muted" }, `${c.backend}${c.rpc ? " " + c.rpc : ""} · horizon ${c.horizon} · seeds ${c.seeds.join(",")} · ${ago(c.createdAt)}`)),
      c.note ? el("div", { class: "muted" }, c.note) : null,
      el("div", { class: "bar", role: "img", "aria-label": Object.entries(k).map(([s, v]) => `${v} ${s}`).join(", ") },
        seg("done", "var(--good)"), seg("running", "var(--accent)"), seg("failed", "var(--critical)"), seg("interrupted", "var(--critical)"), seg("cancelled", "var(--muted)")),
      el("div", { class: "row" },
        el("span", { class: "muted" }, Object.entries(k).map(([s, v]) => `${v} ${s}`).join(" · ")),
        el("button", { class: "link", onclick: () => { $("#run-filter").value = c.id; show("runs"); } }, "view runs"),
        active ? el("button", { class: "link", onclick: async () => { if (confirm(`Cancel ${active} queued/running run(s) in "${c.name}"?`)) { await api(`api/campaigns/${c.id}/cancel`, { method: "POST" }); refresh(); } } }, "cancel") : null)));
  }
}

// ---------- runs ----------
const RUN_COLS = [
  ["", null], ["Run", r => r.spec], ["Seed", r => r.seed, "num"], ["Backend", r => r.backend], ["Status", r => statusChip(r.status)],
  ["Progress", r => r.status === "running" && r.progress ? `${Math.round(100 * r.progress.step / r.progress.of)}% (t=${r.progress.t})` : ""],
  ["Loss", r => usdM(r.summary?.lossUsd), "num"], ["Detect", r => r.summary?.detectT ?? "—", "num"], ["Contain", r => r.summary?.containT ?? "—", "num"],
  ["Benign landed / sent", r => r.summary ? `${r.summary.benignLandedOk ?? "—"} / ${r.summary.benignSent ?? "—"}` : "—", "num"],
  ["Contain (s)", r => r.summary?.containSec ?? "—", "num"], ["Horizon", r => r.horizon, "num"],
  ["Started", r => ago(r.startedAt)], ["Commit", r => r.provenance?.gitCommit?.slice(0, 7) + (r.provenance?.gitDirty ? "*" : "") || "—"],
];
async function refreshRuns() {
  state.runs = await api(`api/runs${$("#run-filter").value ? "?campaign=" + encodeURIComponent($("#run-filter").value) : ""}`);
  const sf = $("#status-filter").value;
  const rows = state.runs.filter(r => !sf || r.status === sf);
  const t = $("#runs-table");
  t.tHead.replaceChildren(el("tr", {}, RUN_COLS.map(([h, , c]) => el("th", { class: c }, h))));
  t.tBodies[0].replaceChildren(...rows.map(r => {
    const cb = el("input", { type: "checkbox", "aria-label": `select ${r.id}`, onclick: e => e.stopPropagation(), onchange: e => { e.target.checked ? state.selected.add(r.id) : state.selected.delete(r.id); syncSel(); } });
    cb.checked = state.selected.has(r.id); cb.disabled = r.status !== "done";
    return el("tr", { class: "clickable", onclick: () => openRun(r.id) }, el("td", {}, cb), RUN_COLS.slice(1).map(([, f, c]) => el("td", { class: c }, f(r))));
  }));
  if (!rows.length) t.tBodies[0].append(el("tr", {}, el("td", { colspan: RUN_COLS.length, class: "muted" }, "No runs.")));
  syncSel();
}
function syncSel() {
  $("#compare-btn").disabled = state.selected.size < 2;
  $("#compare-btn").textContent = `Compare selected (${state.selected.size})`;
  $("#export-btn").href = "api/export.csv" + (state.selected.size ? "?ids=" + [...state.selected].join(",") : ($("#run-filter").value ? "?ids=" + state.runs.map(r => r.id).join(",") : ""));
  $("#export-btn").textContent = state.selected.size ? `Export ${state.selected.size} selected (CSV)` : "Export CSV";
}
$("#run-filter").addEventListener("change", () => { state.selected.clear(); refreshRuns(); });
$("#status-filter").addEventListener("change", refreshRuns);
$("#compare-btn").addEventListener("click", () => show("compare"));

// ---------- charts ----------
const tip = $("#tooltip");
function showTip(evt, content) { tip.replaceChildren(content); tip.hidden = false; const x = Math.min(evt.clientX + 14, innerWidth - tip.offsetWidth - 8); tip.style.left = `${x}px`; tip.style.top = `${evt.clientY + 14}px`; }
const hideTip = () => { tip.hidden = true; };
function niceTicks(max, n = 5) {
  if (max <= 0) return [0];
  const raw = max / n, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const out = []; for (let v = 0; v <= max + step * 0.001; v += step) out.push(v); if (out[out.length - 1] < max) out.push(out[out.length - 1] + step); return out;
}
const short = v => Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(1) + "B" : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "k" : String(Math.round(v * 100) / 100);

// Horizontal bars: one measure, one hue; value labelled at the bar end.
function barChart(host, items, fmt, tickFmt = short) {
  host.replaceChildren();
  const W = 900, rowH = 26, L = 190, R = 90, H = items.length * rowH + 24;
  const max = Math.max(...items.map(i => i.value), 1), ticks = niceTicks(max, 4), top = ticks[ticks.length - 1];
  const x = v => L + (W - L - R) * v / top;
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": items.map(i => `${i.label}: ${fmt(i.value)}`).join("; ") });
  for (const t of ticks) { s.append(svg("line", { class: "grid", x1: x(t), x2: x(t), y1: 0, y2: H - 20 })); const tx = svg("text", { x: x(t), y: H - 6, "text-anchor": "middle" }); tx.textContent = tickFmt(t); s.append(tx); }
  items.forEach((it, i) => {
    const y = i * rowH + 4, w = Math.max(0, x(it.value) - L);
    const lab = svg("text", { x: L - 8, y: y + 13, "text-anchor": "end" }); lab.textContent = it.label; s.append(lab);
    const r = svg("rect", { x: L, y, width: Math.max(w, it.value > 0 ? 2 : 0), height: 18, rx: 4, fill: "var(--series-1)" }); s.append(r);
    const hit = svg("rect", { x: 0, y: y - 2, width: W, height: rowH, fill: "transparent" });
    hit.addEventListener("mousemove", e => showTip(e, el("div", {}, el("b", {}, it.label), el("div", {}, fmt(it.value)), it.sub ? el("div", { class: "muted" }, it.sub) : null)));
    hit.addEventListener("mouseleave", hideTip); s.append(hit);
    const v = svg("text", { x: x(it.value) + 6, y: y + 13 }); v.textContent = fmt(it.value); v.style.fill = "var(--text-primary)"; s.append(v);
  });
  s.append(svg("line", { class: "axis", x1: L, x2: L, y1: 0, y2: H - 20 }));
  host.append(s);
}

// Lines on one shared axis; legend always for >= 2 series, direct end labels for <= 4; crosshair tooltip.
function lineChart(host, series, { xLabel = "step", yFmt = num } = {}) {
  host.replaceChildren();
  if (!series.length) return;
  if (series.length >= 2) host.append(el("div", { class: "legend" }, series.map(s => el("span", {}, el("i", { style: `background:${s.color}` }), s.name))));
  const W = 900, H = 300, L = 64, R = series.length <= 4 ? 120 : 16, T = 8, B = 28;
  const xs = series.flatMap(s => s.points.map(p => p.x)), ys = series.flatMap(s => s.points.map(p => p.y));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), yTicks = niceTicks(Math.max(...ys, 1)), yTop = yTicks[yTicks.length - 1];
  const X = v => L + (W - L - R) * (v - x0) / Math.max(1, x1 - x0), Y = v => T + (H - T - B) * (1 - v / yTop);
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Line chart of ${series.map(s => s.name).join(", ")} by ${xLabel}` });
  for (const t of yTicks) { s.append(svg("line", { class: "grid", x1: L, x2: W - R, y1: Y(t), y2: Y(t) })); const tx = svg("text", { x: L - 6, y: Y(t) + 4, "text-anchor": "end" }); tx.textContent = short(t); s.append(tx); }
  const xStep = niceTicks(x1 - x0, 6)[1] || 1, xTicks = [];
  for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1; v += xStep) xTicks.push(v);
  for (const t of xTicks) { const tx = svg("text", { x: X(t), y: H - 10, "text-anchor": "middle" }); tx.textContent = Math.round(t); s.append(tx); }
  const xl = svg("text", { x: W - R, y: H - 10, "text-anchor": "end" }); xl.textContent = xLabel; s.append(xl);
  s.append(svg("line", { class: "axis", x1: L, x2: W - R, y1: Y(0), y2: Y(0) }));
  if (x0 < 0 && x1 > 0) { s.append(svg("line", { x1: X(0), x2: X(0), y1: T, y2: H - B, stroke: "var(--axis)", "stroke-dasharray": "3 3" })); const t0 = svg("text", { x: X(0) + 4, y: T + 10 }); t0.textContent = "t0"; s.append(t0); }
  for (const se of series) {
    s.append(svg("path", { d: se.points.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(""), fill: "none", stroke: se.color, "stroke-width": 2, "stroke-linejoin": "round" }));
  }
  if (series.length <= 4) {
    const labs = series.map(se => ({ name: se.name, color: se.color, y: Y(se.points[se.points.length - 1].y) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 14) labs[i].y = labs[i - 1].y + 14;
    const over = labs.length ? labs[labs.length - 1].y - (H - B) : 0;
    if (over > 0) for (const l of labs) l.y -= over;
    for (const l of labs) {
      s.append(svg("rect", { x: W - R + 6, y: l.y - 2, width: 8, height: 3, rx: 1.5, fill: l.color }));
      const t = svg("text", { x: W - R + 18, y: l.y + 4 }); t.textContent = l.name; s.append(t);
    }
  }
  const cross = svg("line", { x1: 0, x2: 0, y1: T, y2: H - B, stroke: "var(--axis)", visibility: "hidden" }); s.append(cross);
  const dots = series.map(se => { const d = svg("circle", { r: 4, fill: se.color, stroke: "var(--surface-1)", "stroke-width": 2, visibility: "hidden" }); s.append(d); return d; });
  const hit = svg("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" });
  hit.addEventListener("mousemove", e => {
    const box = s.getBoundingClientRect(), vx = x0 + (((e.clientX - box.left) * W / box.width) - L) / (W - L - R) * (x1 - x0);
    const rows = [];
    series.forEach((se, i) => {
      const p = se.points.reduce((b, q) => Math.abs(q.x - vx) < Math.abs(b.x - vx) ? q : b, se.points[0]);
      dots[i].setAttribute("cx", X(p.x)); dots[i].setAttribute("cy", Y(p.y)); dots[i].setAttribute("visibility", "visible");
      rows.push({ se, p });
    });
    const px = rows[0].p.x; cross.setAttribute("x1", X(px)); cross.setAttribute("x2", X(px)); cross.setAttribute("visibility", "visible");
    showTip(e, el("div", {}, el("b", {}, `${xLabel} ${px}`), rows.sort((a, b) => b.p.y - a.p.y).map(({ se, p }) => el("div", { class: "row" }, el("i", { style: `display:inline-block;width:10px;height:3px;background:${se.color}` }), `${se.name}: ${yFmt(p.y)}`))));
  });
  hit.addEventListener("mouseleave", () => { hideTip(); cross.setAttribute("visibility", "hidden"); dots.forEach(d => d.setAttribute("visibility", "hidden")); });
  s.append(hit);
  host.append(s);
}

// ---------- run detail ----------
async function openRun(id) { state.detailId = id; $("#tab-detail").hidden = false; show("detail"); }
async function refreshDetail() {
  const id = state.detailId; if (!id) return;
  const r = await api(`api/runs/${encodeURIComponent(id)}`);
  const s = r.summary || {}, res = r.result?.results?.[0];
  $("#detail-title").replaceChildren(`${r.spec} · seed ${r.seed} · ${r.backend} `, statusChip(r.status));
  $("#detail-cancel").hidden = !["queued", "running"].includes(r.status);
  $("#detail-cancel").onclick = async () => { await api(`api/runs/${encodeURIComponent(id)}/cancel`, { method: "POST" }); refresh(); };
  const tile = (k, v) => el("div", { class: "tile" }, el("div", { class: "k" }, k), el("div", { class: "v" }, v));
  $("#detail-tiles").replaceChildren(...[
    tile("Loss", usdM(s.lossUsd)), tile("Detect / contain (step)", `${s.detectT ?? "—"} / ${s.containT ?? "—"}`),
    tile("Contain after t0", s.containSec !== null && s.containSec !== undefined ? `${s.containSec} s` : "—"),
    tile("Delegated blocks", s.delegatedBlocks ?? "—"), tile("Benign landed / sent", `${s.benignLandedOk ?? "—"} / ${s.benignSent ?? "—"}`),
    r.status === "running" && r.progress ? tile("Progress", `${Math.round(100 * r.progress.step / r.progress.of)}%`) : null].filter(Boolean));
  const kv = (t, pairs) => $(t).replaceChildren(...pairs.filter(([, v]) => v !== undefined).map(([k, v]) => el("tr", {}, el("td", {}, k), el("td", {}, v ?? "—"))));
  kv("#detail-metrics", [["Configuration", s.configLabel], ["Attacker", s.attackerLabel], ["Loss ETH / USDT / USDC", s.lossETH !== undefined ? `${num(s.lossETH)} / ${num(s.lossUSDT)} / ${num(s.lossUSDC)}` : null],
    ["Containments", s.containments], ["Alerts during attack / false alerts", s.alertsDuringAttack !== undefined ? `${s.alertsDuringAttack} / ${s.falseAlerts}` : null], ["First alert", s.firstAlert],
    ["Benign requested / sent / blocked / escalated / paused", s.benignRequested !== undefined ? `${s.benignRequested} / ${s.benignSent} / ${s.benignBlocked} / ${s.benignEscalated} / ${s.benignPaused}` : null],
    ["Benign landed: ok / reverted / never mined / rejected at send", s.benignLandedOk !== undefined ? `${s.benignLandedOk} / ${s.benignReverted} / ${s.benignMissing} / ${s.benignRejectedAtSend}` : null],
    ["Detect / contain after t0", s.detectSec !== undefined && s.detectSec !== null ? `${s.detectSec} s (${s.detectBlocks} blocks) / ${s.containSec ?? "—"} s (${s.containBlocks ?? "—"} blocks)` : null],
    ["Step overruns", s.steps ? `${s.stepOverruns} of ${s.steps}` : null], ["Runtime", s.runtimeSec !== undefined ? `${s.runtimeSec} s` : null],
    ["Signer denials", res ? Object.entries(res.signerDenials || {}).map(([k, v]) => `${k} ×${v}`).join(", ") || "none" : null]]);
  const p = r.provenance || {};
  kv("#detail-prov", [["Run id", r.id], ["Campaign", r.campaign], ["Command", `BACKEND=${r.backend}${r.rpc ? " RPC=" + r.rpc : ""} HORIZON=${r.horizon} SEEDS=${r.seed}${r.trace ? " TRACE=1" : ""} node sim.mjs =${r.spec}`],
    ["Git commit", p.gitCommit ? `${p.gitCommit}${p.gitDirty ? " (uncommitted changes present)" : ""}` : null], ["sim.mjs sha256", p.simSha256], ["Client", s.client], ["Chain id", s.chainId],
    ["Node / host", p.node ? `${p.node} on ${p.host} (${p.platform})` : null], ["Concurrent runs at start", p.concurrentAtStart ? `${p.concurrentAtStart} (limit ${p.concurrencyLimit})` : null],
    ["Queued / started / finished", `${r.createdAt} / ${r.startedAt || "—"} / ${r.finishedAt || "—"}`], ["Exit", r.exitCode !== null ? `code ${r.exitCode}${r.signal ? " " + r.signal : ""}` : null]]);
  const tr = res?.trace;
  $("#detail-trace-card").hidden = !tr;
  if (tr) lineChart($("#detail-trace"), [
    { name: "Attacker", color: SERIES(0), points: tr.map(q => ({ x: q.t, y: weiToEth(q.hubETH) })) },
    { name: "Hot wallet 14", color: SERIES(1), points: tr.map(q => ({ x: q.t, y: weiToEth(q.hot14ETH) })) },
    { name: "Hot wallet 16", color: SERIES(2), points: tr.map(q => ({ x: q.t, y: weiToEth(q.hot16ETH) })) }], { yFmt: v => `${num(v)} ETH` });
  $("#detail-events").replaceChildren(...(res?.log || []).map(([t, m]) => el("tr", {}, el("td", {}, `step ${t}`), el("td", {}, m))));
  if (!res?.log?.length) $("#detail-events").append(el("tr", {}, el("td", { class: "muted" }, r.status === "done" ? "No events." : "Available when the run finishes.")));
  const log = await api(`api/runs/${encodeURIComponent(id)}/log`);
  const pre = $("#detail-log"); const atEnd = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 4;
  pre.textContent = log.split("\n").filter(l => !l.startsWith('{"progress"')).join("\n") || "(no output yet)";
  if (atEnd) pre.scrollTop = pre.scrollHeight;
}

// ---------- compare ----------
async function refreshCompare() {
  const ids = [...state.selected];
  $("#compare-empty").hidden = ids.length >= 2; $("#compare-body").hidden = ids.length < 2;
  if (ids.length < 2) return;
  const runs = await Promise.all(ids.map(id => api(`api/runs/${encodeURIComponent(id)}`)));
  const name = r => `${r.spec} s${r.seed} ${r.backend}`;
  barChart($("#loss-chart"), runs.map(r => ({ label: name(r), value: r.summary?.lossUsd || 0, sub: r.id })), usdM, v => "$" + short(v));
  // Never let a comparison hide a difference in conditions.
  const diffs = [];
  const uniq = f => [...new Set(runs.map(f))];
  if (uniq(r => r.horizon).length > 1) diffs.push(`horizons differ (${uniq(r => r.horizon).join(", ")} steps): later incident events are missing from the shorter runs`);
  if (uniq(r => r.backend).length > 1) diffs.push(`backends differ (${uniq(r => r.backend).join(", ")}): mempool and timing semantics differ (see docs/SCOPE_AND_LIMITATIONS.md E8)`);
  if (uniq(r => r.summary?.chainId).length > 1) diffs.push(`chains differ (${uniq(r => r.summary?.chainId).join(", ")})`);
  if (uniq(r => r.provenance?.simSha256).length > 1) diffs.push("simulator code differs between runs (different sim.mjs hashes)");
  if (runs.some(r => r.provenance?.gitDirty)) diffs.push("some runs used uncommitted code and cannot be reproduced from a commit");
  $("#compare-notice").replaceChildren(...diffs.map(d => el("div", { class: "notice" }, "Not like-for-like: ", d)));
  const traced = runs.filter(r => r.result?.results?.[0]?.trace);
  const shown = traced.slice(0, 8);
  $("#trace-note").textContent = !traced.length ? "None of the selected runs has a per-step trace. Queue runs with “Per-step trace” to compare trajectories."
    : traced.length > 8 ? `Showing the first 8 of ${traced.length} traced runs (one color per run; more would not stay distinguishable).` : "";
  lineChart($("#trace-chart"), shown.map((r, i) => ({ name: name(r), color: SERIES(i), points: r.result.results[0].trace.map(q => ({ x: q.t, y: weiToEth(q.hubETH) })) })), { yFmt: v => `${num(v)} ETH` });
  const rows = [["Run id", r => r.id], ["Backend", r => r.backend + (r.rpc ? ` ${r.rpc}` : "")], ["Horizon", r => r.horizon], ["Loss", r => usdM(r.summary?.lossUsd)],
    ["Loss ETH", r => num(r.summary?.lossETH)], ["Loss USDT", r => num(r.summary?.lossUSDT)], ["Loss USDC", r => num(r.summary?.lossUSDC)],
    ["Detect / contain (step)", r => `${r.summary?.detectT ?? "—"} / ${r.summary?.containT ?? "—"}`], ["Contain after t0 (s)", r => r.summary?.containSec ?? "—"],
    ["Delegated blocks", r => r.summary?.delegatedBlocks], ["Benign landed / sent", r => `${r.summary?.benignLandedOk ?? "—"} / ${r.summary?.benignSent ?? "—"}`],
    ["Benign blocked", r => r.summary?.benignBlocked], ["Step overruns", r => r.summary?.steps ? `${r.summary.stepOverruns}/${r.summary.steps}` : "—"],
    ["Client", r => (r.summary?.client || "").split("/").slice(0, 2).join(" ")], ["Commit", r => (r.provenance?.gitCommit || "").slice(0, 7) + (r.provenance?.gitDirty ? "*" : "")]];
  $("#compare-table").replaceChildren(el("thead", {}, el("tr", {}, el("th", {}, ""), runs.map(r => el("th", { class: "num" }, name(r))))),
    el("tbody", {}, rows.map(([k, f]) => el("tr", {}, el("td", {}, k), runs.map(r => el("td", { class: "num" }, f(r) ?? "—"))))));
}

// ---------- refresh loop ----------
let busy = false;
async function refresh() {
  if (busy) return; busy = true;
  try {
    await refreshStatus();
    if (state.tab === "campaigns") await refreshCampaigns();
    if (state.tab === "runs") { if (!state.campaigns.length) await refreshCampaigns(); await refreshRuns(); }
    if (state.tab === "compare") await refreshCompare();
    if (state.tab === "detail") await refreshDetail();
  } catch (e) { console.error(e); } finally { busy = false; }
}
(async () => {
  state.catalog = await api("api/catalog");
  buildPicker(); estimate();
  await refresh();
  setInterval(() => { if (state.tab !== "compare") refresh(); else refreshStatus(); }, 3000);
})();
