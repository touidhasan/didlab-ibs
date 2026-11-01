// Probe for limitation E13: does the node answer eth_getBalance with null right after a new block?
// Polls eth_blockNumber; on every new block it immediately reads balances at "latest" and at the
// explicit block number, and logs any null result. Independent of the simulator, so it can serve as a
// minimal reproduction for an upstream report.
//
// Usage (run when no campaign is active, to keep campaign timing clean):
//   RPC=http://127.0.0.1:18545 MINUTES=60 node probe-null-reads.mjs > probe-$(date +%F-%H%M).jsonl
// Optional: ADDRS=0xabc...,0xdef...   POLL_MS=20
const RPC = process.env.RPC || "http://127.0.0.1:18545";
const MINUTES = Number(process.env.MINUTES || 60);
const POLL_MS = Number(process.env.POLL_MS || 20);
const ADDRS = (process.env.ADDRS || "0xfA2f208E78283a2AB105d4C05F081AC0e025C7e8").split(","); // faucet

let id = 0;
async function rpc(method, params = []) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

const client = await rpc("web3_clientVersion").catch(() => null);
const end = Date.now() + MINUTES * 60_000;
let last = null, blocks = 0, reads = 0, nulls = 0, errors = 0;
while (Date.now() < end) {
  const bn = await rpc("eth_blockNumber").catch(() => null);
  if (bn && bn !== last) {
    last = bn; blocks++;
    const seenAt = Date.now();
    for (const a of ADDRS) for (const tag of ["latest", bn]) {
      reads++;
      try {
        const v = await rpc("eth_getBalance", [a, tag]);
        if (v === null) {
          nulls++;
          console.log(JSON.stringify({ at: new Date().toISOString(), msAfterNewBlock: Date.now() - seenAt,
            block: parseInt(bn, 16), addr: a, tag: tag === "latest" ? "latest" : "number" }));
        }
      } catch (e) { errors++; console.log(JSON.stringify({ at: new Date().toISOString(), error: e.message })); }
    }
  }
  await new Promise(r => setTimeout(r, POLL_MS));
}
console.log(JSON.stringify({ summary: { rpc: RPC, client, minutes: MINUTES, blocks, reads, nulls, errors } }));
