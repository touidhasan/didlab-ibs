// DIDLab IBS experiment dashboard: launch campaigns, watch runs and the chain, browse/compare/export results.
// No dependencies beyond Node 20+. Binds to 127.0.0.1 by default; it can start processes, so never expose it.
//   node dashboard/server.mjs            -> http://127.0.0.1:8090
// Env: PORT (8090), HOST (127.0.0.1), DATA_DIR (<repo>/runs), RPC (http://127.0.0.1:18545), CONCURRENCY (1)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.mjs";
import { Runner } from "./runner.mjs";
import { chainStatus } from "./chain.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "..");
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(REPO, "runs"));
const DEFAULT_RPC = process.env.RPC || "http://127.0.0.1:18545";

const store = new Store(DATA_DIR);
const runner = new Runner({ store, repo: REPO, concurrency: Number(process.env.CONCURRENCY || 1) });
runner.recover();

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};
const readBody = req => new Promise((ok, bad) => {
  let b = ""; req.on("data", c => { b += c; if (b.length > 1e6) { bad(new Error("body too large")); req.destroy(); } });
  req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { bad(e); } });
});

let catalogCache = null;
async function catalog() {
  if (!catalogCache) catalogCache = await runner.listCatalog();
  return catalogCache;
}

const routes = [
  ["GET", /^\/api\/status$/, async (req, res, m, q) => send(res, 200, {
    repo: runner.provenance(), queue: runner.queueState(), dataDir: DATA_DIR,
    chain: await chainStatus(q.get("rpc") || DEFAULT_RPC), defaultRpc: DEFAULT_RPC,
  })],
  ["GET", /^\/api\/catalog$/, async (req, res) => send(res, 200, await catalog())],
  ["GET", /^\/api\/campaigns$/, async (req, res) => send(res, 200, store.listCampaigns())],
  ["POST", /^\/api\/campaigns$/, async (req, res) => {
    const body = await readBody(req);
    const cat = await catalog();
    const errors = validateCampaign(body, cat);
    if (errors.length) return send(res, 400, { errors });
    const c = runner.createCampaign({ ...body, rpc: body.backend === "rpc" ? (body.rpc || DEFAULT_RPC) : null });
    send(res, 201, c);
  }],
  ["POST", /^\/api\/campaigns\/([\w-]+)\/cancel$/, async (req, res, m) => send(res, 200, runner.cancelCampaign(m[1]))],
  ["GET", /^\/api\/runs$/, async (req, res, m, q) => send(res, 200, store.listRuns({ campaign: q.get("campaign") }))],
  ["GET", /^\/api\/runs\/([\w-]+)$/, async (req, res, m) => {
    const r = store.getRun(m[1]); if (!r) return send(res, 404, { error: "no such run" });
    send(res, 200, { ...r, result: store.getResult(m[1]) });
  }],
  ["GET", /^\/api\/runs\/([\w-]+)\/log$/, async (req, res, m) => send(res, 200, store.getLog(m[1]), "text/plain; charset=utf-8")],
  ["POST", /^\/api\/runs\/([\w-]+)\/cancel$/, async (req, res, m) => send(res, 200, runner.cancelRun(m[1]))],
  ["GET", /^\/api\/export\.csv$/, async (req, res, m, q) => {
    const ids = (q.get("ids") || "").split(",").filter(Boolean);
    const csv = store.exportCsv(ids.length ? ids : store.listRuns({}).map(r => r.id));
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=ibs-runs.csv" });
    res.end(csv);
  }],
];

function validateCampaign(b, cat) {
  const e = [];
  if (!["hardhat", "rpc"].includes(b.backend)) e.push("backend must be hardhat or rpc");
  if (!Array.isArray(b.runs) || !b.runs.length) e.push("select at least one run");
  else for (const r of b.runs) if (!cat.runs.includes(r)) e.push(`unknown run ${r}`);
  if (!Array.isArray(b.seeds) || !b.seeds.length || b.seeds.some(s => !Number.isInteger(s) || s < 0)) e.push("seeds must be non-negative integers");
  if (!Number.isInteger(b.horizon) || b.horizon < 20 || b.horizon > 5000) e.push("horizon must be an integer between 20 and 5000");
  if (b.rpc && !/^https?:\/\/[\w.-]+(:\d+)?(\/.*)?$/.test(b.rpc)) e.push("rpc must be an http(s) URL");
  if ((b.runs?.length || 0) * (b.seeds?.length || 0) > 500) e.push("a campaign is limited to 500 runs");
  return e;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    // Same-origin only for state-changing requests (guards against cross-site form posts).
    if (req.method === "POST") {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: "cross-origin request refused" });
    }
    for (const [method, re, fn] of routes) {
      const m = url.pathname.match(re);
      if (m && req.method === method) return await fn(req, res, m, url.searchParams);
    }
    if (req.method !== "GET") return send(res, 405, { error: "method not allowed" });
    const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const file = path.resolve(here, "public", rel);
    if (!file.startsWith(path.join(here, "public") + path.sep) || !fs.existsSync(file)) return send(res, 404, { error: "not found" });
    send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || "application/octet-stream");
  } catch (err) {
    send(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`IBS dashboard on http://${HOST}:${PORT}  data=${DATA_DIR}  rpc=${DEFAULT_RPC}  concurrency=${runner.concurrency}`);
  if (HOST !== "127.0.0.1" && HOST !== "localhost") console.log("WARNING: bound beyond localhost. This server can start processes; expose it only on a private network.");
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { runner.shutdown(); server.close(); process.exit(0); });
