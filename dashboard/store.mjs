// File-based run store. One directory per run so data stays inspectable, diffable and easy to archive:
//   <DATA_DIR>/campaigns/<campaignId>.json
//   <DATA_DIR>/runs/<runId>/run.json      status, parameters, provenance, summary
//   <DATA_DIR>/runs/<runId>/result.json   full simulator output ({ meta, results })
//   <DATA_DIR>/runs/<runId>/log.txt       simulator stdout/stderr
import fs from "node:fs";
import path from "node:path";

const writeJson = (file, obj) => {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
};
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.cDir = path.join(dir, "campaigns");
    this.rDir = path.join(dir, "runs");
    fs.mkdirSync(this.cDir, { recursive: true });
    fs.mkdirSync(this.rDir, { recursive: true });
  }
  runDir(id) { return path.join(this.rDir, id); }
  saveCampaign(c) { writeJson(path.join(this.cDir, `${c.id}.json`), c); }
  getCampaign(id) { return readJson(path.join(this.cDir, `${id}.json`)); }
  listCampaigns() {
    return fs.readdirSync(this.cDir).filter(f => f.endsWith(".json")).map(f => readJson(path.join(this.cDir, f))).filter(Boolean)
      .map(c => ({ ...c, counts: this.countByStatus(c.runIds) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  countByStatus(ids) {
    const n = {};
    for (const id of ids) { const r = this.getRun(id); const s = r?.status || "missing"; n[s] = (n[s] || 0) + 1; }
    return n;
  }
  saveRun(r) { fs.mkdirSync(this.runDir(r.id), { recursive: true }); writeJson(path.join(this.runDir(r.id), "run.json"), r); }
  getRun(id) { return /^[\w-]+$/.test(id) ? readJson(path.join(this.runDir(id), "run.json")) : null; }
  updateRun(id, patch) { const r = this.getRun(id); if (!r) return null; Object.assign(r, patch); this.saveRun(r); return r; }
  listRuns({ campaign } = {}) {
    return fs.readdirSync(this.rDir).map(id => this.getRun(id)).filter(Boolean)
      .filter(r => !campaign || r.campaign === campaign)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || (a.seq ?? 0) - (b.seq ?? 0) || a.id.localeCompare(b.id));
  }
  resultPath(id) { return path.join(this.runDir(id), "result.json"); }
  logPath(id) { return path.join(this.runDir(id), "log.txt"); }
  getResult(id) { return /^[\w-]+$/.test(id) ? readJson(this.resultPath(id)) : null; }
  getLog(id) {
    if (!/^[\w-]+$/.test(id)) return "";
    try { const t = fs.readFileSync(this.logPath(id), "utf8"); return t.length > 200_000 ? "…(truncated)\n" + t.slice(-200_000) : t; } catch { return ""; }
  }

  // Compact per-run summary kept in run.json so lists and exports never parse large result files.
  static summarize(result) {
    const r = result?.results?.[0];
    if (!r) return null;
    const L = r.benignLanded || {};
    return {
      lossUsd: r.lossUsd, lossETH: r.loss?.ETH, lossUSDT: r.loss?.USDT, lossUSDC: r.loss?.USDC,
      detectT: r.detectT, containT: r.containT, containments: r.containments, delegatedBlocks: r.delegatedBlocks,
      alertsDuringAttack: r.alertsDuringAttack, falseAlerts: r.falseAlerts, firstAlert: r.firstAlert,
      benignRequested: r.benign?.requested, benignSent: r.benign?.completed, benignBlocked: r.benign?.blocked,
      benignEscalated: r.benign?.escalated, benignPaused: r.benign?.paused,
      benignLandedOk: L.success, benignReverted: L.reverted, benignMissing: L.missing, benignRejectedAtSend: L.rejectedAtSend,
      detectSec: r.timing?.detectSecAfterT0 ?? null, containSec: r.timing?.containSecAfterT0 ?? null,
      detectBlocks: r.timing?.detectBlocksAfterT0 ?? null, containBlocks: r.timing?.containBlocksAfterT0 ?? null,
      stepOverruns: r.timing?.steps?.overruns ?? null, steps: r.timing?.steps?.steps ?? null,
      runtimeSec: r.runtimeSec, client: result.meta?.client, chainId: result.meta?.chainId,
      configLabel: r.config, attackerLabel: r.attacker,
    };
  }

  exportCsv(ids) {
    const cols = ["id", "campaign", "spec", "seed", "backend", "rpc", "horizon", "status", "startedAt", "finishedAt",
      "gitCommit", "gitDirty", "simSha256", "node",
      "lossUsd", "lossETH", "lossUSDT", "lossUSDC", "detectT", "containT", "containments", "delegatedBlocks",
      "alertsDuringAttack", "falseAlerts", "firstAlert", "benignRequested", "benignSent", "benignBlocked", "benignEscalated",
      "benignPaused", "benignLandedOk", "benignReverted", "benignMissing", "benignRejectedAtSend",
      "detectSec", "containSec", "detectBlocks", "containBlocks", "stepOverruns", "steps", "runtimeSec", "client", "chainId",
      "attempt", "retryOf", "retriedBy", "exitCode", "signal", "simChanged"];
    const esc = v => v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const rows = [cols.join(",")];
    for (const id of ids) {
      const r = this.getRun(id); if (!r) continue;
      const flat = { ...r, gitCommit: r.provenance?.gitCommit, gitDirty: r.provenance?.gitDirty, simSha256: r.provenance?.simSha256,
        node: r.provenance?.node, ...(r.summary || {}), attempt: r.attempt ?? 1 };
      rows.push(cols.map(c => esc(flat[c])).join(","));
    }
    return rows.join("\n") + "\n";
  }
}
