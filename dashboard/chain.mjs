// Chain health for the dashboard header: identity, height, block period, peers, transaction pool.
const cache = new Map();

async function rpc(url, method, params = []) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 3000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: ctl.signal });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || "rpc error");
    return j.result;
  } finally { clearTimeout(t); }
}

export async function chainStatus(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 2000) return hit.value;
  let value;
  try {
    const [chainId, head, client, peers] = await Promise.all([
      rpc(url, "eth_chainId"), rpc(url, "eth_getBlockByNumber", ["latest", false]),
      rpc(url, "web3_clientVersion").catch(() => null), rpc(url, "net_peerCount").catch(() => null)]);
    const n = Number(head.number);
    const back = Math.min(100, n);
    let periodSec = null;
    if (back > 0) {
      const old = await rpc(url, "eth_getBlockByNumber", ["0x" + (n - back).toString(16), false]);
      periodSec = (Number(head.timestamp) - Number(old.timestamp)) / back;
    }
    const pool = await rpc(url, "txpool_besuStatistics").catch(() => null);
    value = { ok: true, url, chainId: Number(chainId), block: n, client, peers: peers === null ? null : Number(peers),
      periodSec, lastBlockAgeSec: Math.max(0, Math.round(Date.now() / 1000 - Number(head.timestamp))),
      prague: head.requestsHash !== undefined, txpool: pool ? { local: pool.localCount, remote: pool.remoteCount, max: pool.maxSize } : null };
  } catch (e) {
    value = { ok: false, url, error: e.name === "AbortError" ? "timeout" : String(e.message || e) };
  }
  cache.set(url, { at: Date.now(), value });
  return value;
}
