// Test of the start-up crash retry (limitation E14). Runs the real Runner and Store against a fake simulator in a
// scratch directory, so no chain or Hardhat is needed:
//   CRASH-ONCE    killed by a signal on its first start only -> retried once, second attempt completes
//   CRASH-ALWAYS  killed on every start -> 3 attempts (MAX_RETRIES = 2), all kept, then it stops
//   CRASH-LATE    killed after reporting progress -> not a start-up crash, never retried
//   OK            completes -> no retry fields
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { Store } from "./store.mjs";
import { Runner } from "./runner.mjs";

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "ibs-retry-"));
const REPO = path.join(ROOT, "repo"), DATA = path.join(ROOT, "data");
fs.mkdirSync(path.join(REPO, "testbed"), { recursive: true });
fs.writeFileSync(path.join(REPO, "testbed", "sim.mjs"), `
import fs from "node:fs";
const spec = process.argv[2].slice(1), mark = "crashed-" + spec;
const die = () => process.kill(process.pid, "SIGKILL");
const finish = () => { fs.writeFileSync(process.env.OUT, JSON.stringify({ meta: {}, results: [{ lossUsd: 0, benign: {}, benignLanded: {} }] })); };
if (spec === "CRASH-ALWAYS") die();
else if (spec === "CRASH-ONCE" && !fs.existsSync(mark)) { fs.writeFileSync(mark, ""); die(); }
else if (spec === "CRASH-LATE") process.stdout.write(JSON.stringify({ progress: { step: 1, of: 10, t: 0 } }) + "\\n", die);
else finish();
`);

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = false;
try {
  const store = new Store(DATA);
  const runner = new Runner({ store, repo: REPO, concurrency: 1 });
  const c = runner.createCampaign({ name: "retry", backend: "hardhat", runs: ["CRASH-ONCE", "CRASH-LATE", "CRASH-ALWAYS", "OK"], seeds: [1], horizon: 10, trace: false });
  for (let i = 0; i < 200 && store.listRuns({ campaign: c.id }).some(r => ["queued", "running"].includes(r.status)); i++) await sleep(100);

  const runs = store.listRuns({ campaign: c.id });
  const byId = Object.fromEntries(runs.map(r => [r.id.slice(c.id.length + 1), r]));
  assert.deepEqual(Object.keys(byId).sort(), ["CRASH-ALWAYS-s1", "CRASH-ALWAYS-s1-a2", "CRASH-ALWAYS-s1-a3", "CRASH-LATE-s1", "CRASH-ONCE-s1", "CRASH-ONCE-s1-a2", "OK-s1"]);

  const once = byId["CRASH-ONCE-s1"], once2 = byId["CRASH-ONCE-s1-a2"];
  assert.equal(once.status, "failed"); assert.equal(once.signal, "SIGKILL"); assert.equal(once.retriedBy, once2.id);
  assert.equal(once2.status, "done"); assert.equal(once2.attempt, 2); assert.equal(once2.retryOf, once.id);
  assert.match(once2.retryReason, /start-up crash \(SIGKILL/);

  assert.equal(byId["CRASH-LATE-s1"].status, "failed"); assert.ok(byId["CRASH-LATE-s1"].progress, "progress was reported");
  assert.equal(byId["CRASH-LATE-s1"].retriedBy, undefined, "a crash after progress is not retried");

  const always = ["CRASH-ALWAYS-s1", "CRASH-ALWAYS-s1-a2", "CRASH-ALWAYS-s1-a3"].map(k => byId[k]);
  assert.deepEqual(always.map(r => r.status), ["failed", "failed", "failed"]);
  assert.deepEqual(always.map(r => r.attempt ?? 1), [1, 2, 3]);
  assert.equal(always[2].retriedBy, undefined, "stops after MAX_RETRIES");
  assert.equal(always[2].retryOf, always[0].id, "every retry points at the first attempt");

  assert.equal(byId["OK-s1"].status, "done"); assert.equal(byId["OK-s1"].attempt, undefined);

  const order = [...runs].sort((p, q) => p.startedAt.localeCompare(q.startedAt)).map(r => r.id.slice(c.id.length + 1));
  assert.deepEqual(order, ["CRASH-ONCE-s1", "CRASH-ONCE-s1-a2", "CRASH-LATE-s1", "CRASH-ALWAYS-s1", "CRASH-ALWAYS-s1-a2", "CRASH-ALWAYS-s1-a3", "OK-s1"],
    "a retry runs right after its failed attempt");
  assert.deepEqual(store.getCampaign(c.id).runIds.map(id => id.slice(c.id.length + 1)), order, "the campaign lists every attempt in order");

  const csv = store.exportCsv(store.getCampaign(c.id).runIds).trim().split("\n");
  const head = csv[0].split(","), col = name => csv.slice(1).map(l => l.split(",").at(head.indexOf(name)));
  assert.deepEqual(col("attempt"), ["1", "2", "1", "1", "2", "3", "1"]);
  assert.deepEqual(col("signal"), ["SIGKILL", "", "SIGKILL", "SIGKILL", "SIGKILL", "SIGKILL", ""]);
  ok = true;
  console.log("dashboard retry: PASS");
} finally {
  fs.rmSync(ROOT, { recursive: true, force: true });
  if (!ok) { console.log("dashboard retry: FAIL"); process.exitCode = 1; }
}
