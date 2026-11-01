// Job queue: one simulator process per (run spec, seed). Restart-safe: queued runs resume, runs that were
// executing when the server stopped are marked "interrupted" (never silently re-run or counted).
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "./store.mjs";

const stamp = () => new Date().toISOString();
const shortId = () => crypto.randomBytes(3).toString("hex");

export class Runner {
  constructor({ store, repo, concurrency = 1 }) {
    this.store = store; this.repo = repo; this.testbed = path.join(repo, "testbed");
    this.concurrency = Math.max(1, Math.min(8, concurrency));
    this.children = new Map(); // runId -> child process
  }

  provenance() {
    const git = args => { try { return execFileSync("git", args, { cwd: this.repo, encoding: "utf8" }).trim(); } catch { return null; } };
    const sim = path.join(this.testbed, "sim.mjs");
    return {
      gitCommit: git(["rev-parse", "HEAD"]),
      gitBranch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
      gitDirty: !!git(["status", "--porcelain", "--", "testbed", "research-net"]),
      simSha256: fs.existsSync(sim) ? crypto.createHash("sha256").update(fs.readFileSync(sim)).digest("hex") : null,
      node: process.version, host: os.hostname(), platform: `${os.platform()} ${os.release()}`,
    };
  }

  async listCatalog() {
    const out = execFileSync(process.execPath, ["sim.mjs", "--list"], { cwd: this.testbed, encoding: "utf8", env: { ...process.env, BACKEND: "hardhat" } });
    const line = out.split("\n").find(l => l.startsWith("{"));
    return JSON.parse(line);
  }

  createCampaign({ name, note, backend, rpc, runs, seeds, horizon, trace }) {
    const created = stamp();
    const id = `c${created.slice(0, 19).replace(/[-:T]/g, "")}-${shortId()}`;
    const runIds = [];
    let seq = 0;
    for (const spec of runs) for (const seed of seeds) {
      const rid = `${id}-${spec}-s${seed}`;
      this.store.saveRun({ id: rid, campaign: id, seq: seq++, spec, seed, backend, rpc, horizon, trace: !!trace,
        status: "queued", createdAt: created, startedAt: null, finishedAt: null, exitCode: null, progress: null, summary: null });
      runIds.push(rid);
    }
    const c = { id, name: (name || "").slice(0, 120) || `${backend} campaign`, note: (note || "").slice(0, 2000),
      backend, rpc, runs, seeds, horizon, trace: !!trace, createdAt: created, runIds };
    this.store.saveCampaign(c);
    this.pump();
    return c;
  }

  queued() { return this.store.listRuns({}).filter(r => r.status === "queued"); }

  pump() {
    while (this.children.size < this.concurrency) {
      const next = this.queued()[0];
      if (!next) return;
      this.start(next);
    }
  }

  start(run) {
    const prov = { ...this.provenance(), concurrentAtStart: this.children.size + 1, concurrencyLimit: this.concurrency };
    const out = this.store.resultPath(run.id);
    try { fs.unlinkSync(out); } catch {}
    const log = fs.openSync(this.store.logPath(run.id), "a");
    const env = { ...process.env, BACKEND: run.backend, HORIZON: String(run.horizon), SEEDS: String(run.seed),
      OUT: out, PROGRESS: "10", ...(run.trace ? { TRACE: "1" } : {}), ...(run.rpc ? { RPC: run.rpc } : {}) };
    delete env.PORT; delete env.HOST;
    if (!run.trace) delete env.TRACE;
    const child = spawn(process.execPath, ["sim.mjs", `=${run.spec}`], { cwd: this.testbed, env, stdio: ["ignore", "pipe", "pipe"] });
    this.children.set(run.id, child);
    this.store.updateRun(run.id, { status: "running", startedAt: stamp(), provenance: prov, pid: child.pid });
    let lastWrite = 0;
    const onData = buf => {
      fs.writeSync(log, buf);
      for (const line of buf.toString().split("\n")) {
        if (!line.startsWith("{\"progress\"")) continue;
        try {
          const p = JSON.parse(line).progress;
          const now = Date.now();
          if (now - lastWrite > 1500 || p.step + 10 >= p.of) { this.store.updateRun(run.id, { progress: p }); lastWrite = now; }
        } catch {}
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", (code, signal) => {
      fs.closeSync(log);
      this.children.delete(run.id);
      const cur = this.store.getRun(run.id);
      const result = this.store.getResult(run.id);
      let status;
      if (cur?.status === "cancelled" || signal === "SIGTERM" && cur?.cancelRequested) status = "cancelled";
      else if (cur?.status === "interrupted") status = "interrupted";
      else status = code === 0 && result ? "done" : "failed";
      this.store.updateRun(run.id, { status, finishedAt: stamp(), exitCode: code, signal: signal || null,
        summary: result ? Store.summarize(result) : null });
      this.pump();
    });
  }

  cancelRun(id) {
    const r = this.store.getRun(id);
    if (!r) return { error: "no such run" };
    if (r.status === "queued") return this.store.updateRun(id, { status: "cancelled", finishedAt: stamp() });
    if (r.status === "running") {
      this.store.updateRun(id, { cancelRequested: true, status: "cancelled" });
      this.children.get(id)?.kill("SIGTERM");
      return this.store.getRun(id);
    }
    return r;
  }

  cancelCampaign(cid) {
    const c = this.store.getCampaign(cid);
    if (!c) return { error: "no such campaign" };
    for (const id of c.runIds) { const r = this.store.getRun(id); if (r && ["queued", "running"].includes(r.status)) this.cancelRun(id); }
    return { ok: true, counts: this.store.countByStatus(c.runIds) };
  }

  // After a restart: runs that were executing cannot be trusted -> "interrupted"; queued runs resume.
  recover() {
    for (const r of this.store.listRuns({})) if (r.status === "running") this.store.updateRun(r.id, { status: "interrupted", finishedAt: stamp() });
    this.pump();
  }

  shutdown() {
    for (const [id, child] of this.children) { this.store.updateRun(id, { status: "interrupted", finishedAt: stamp() }); child.kill("SIGTERM"); }
  }

  queueState() {
    const all = this.store.listRuns({});
    return {
      concurrency: this.concurrency,
      running: all.filter(r => r.status === "running").map(r => ({ id: r.id, spec: r.spec, seed: r.seed, backend: r.backend, progress: r.progress, startedAt: r.startedAt })),
      queued: all.filter(r => r.status === "queued").length,
    };
  }
}
