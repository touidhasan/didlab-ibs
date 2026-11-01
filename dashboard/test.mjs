// End-to-end test: starts the dashboard on a scratch port and data dir, runs a short Hardhat campaign,
// and checks results, provenance, CSV export, input validation and the cross-origin guard.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const PORT = 8000 + Math.floor(Math.random() * 900);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "ibs-dash-"));
const base = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["server.mjs"], { cwd: path.dirname(new URL(import.meta.url).pathname),
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, RPC: "http://127.0.0.1:1" }, stdio: ["ignore", "inherit", "inherit"] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const j = async (p, o) => { const r = await fetch(base + p, o); return { status: r.status, body: (r.headers.get("content-type") || "").includes("json") ? await r.json() : await r.text() }; };
let ok = false;
try {
  for (let i = 0; i < 40 && !(await fetch(base + "/api/status").then(() => true, () => false)); i++) await sleep(250);
  const st = await j("/api/status");
  assert.equal(st.status, 200); assert.equal(st.body.chain.ok, false, "unreachable RPC must be reported, not hidden");
  const cat = await j("/api/catalog");
  assert.ok(cat.body.runs.includes("R4-A1") && cat.body.runs.length >= 30, "catalog lists the run matrix");

  const bad = await j("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ backend: "x", runs: ["nope"], seeds: [-1], horizon: 1 }) });
  assert.equal(bad.status, 400); assert.equal(bad.body.errors.length, 4);
  const xo = await j("/api/campaigns", { method: "POST", headers: { "content-type": "application/json", origin: "http://evil.example" }, body: "{}" });
  assert.equal(xo.status, 403);
  const trav = await j("/%2e%2e/server.mjs"); assert.equal(trav.status, 404);

  const c = await j("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "ci", backend: "hardhat", runs: ["R4-A1", "R0-A3"], seeds: [7], horizon: 40, trace: true }) });
  assert.equal(c.status, 201); assert.equal(c.body.runIds.length, 2);
  let runs;
  for (let i = 0; i < 240; i++) { runs = (await j(`/api/runs?campaign=${c.body.id}`)).body; if (runs.every(r => ["done", "failed"].includes(r.status))) break; await sleep(500); }
  assert.deepEqual(runs.map(r => r.status), ["done", "done"], "both runs finish");
  assert.deepEqual(runs.map(r => r.spec), ["R4-A1", "R0-A3"], "runs execute in the selected order");
  const r4 = (await j(`/api/runs/${runs[0].id}`)).body;
  assert.equal(r4.summary.lossUsd, 0); assert.equal(r4.summary.detectT, -16);
  assert.ok(r4.result.results[0].trace.length > 0, "trace recorded");
  assert.match(r4.provenance.gitCommit || "", /^[0-9a-f]{40}$/); assert.match(r4.provenance.simSha256, /^[0-9a-f]{64}$/);
  const csv = await j(`/api/export.csv?ids=${runs.map(r => r.id).join(",")}`);
  assert.equal(csv.body.trim().split("\n").length, 3, "CSV has header + 2 rows");
  assert.ok(csv.body.split("\n")[0].includes("simSha256"));
  ok = true;
  console.log("dashboard e2e: PASS");
} finally {
  srv.kill("SIGTERM"); fs.rmSync(DATA, { recursive: true, force: true });
  if (!ok) { console.log("dashboard e2e: FAIL"); process.exitCode = 1; }
}
