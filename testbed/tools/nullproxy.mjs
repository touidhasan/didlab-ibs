// Fault injection for tests: JSON-RPC proxy that answers every Nth eth_getBalance with result:null
// (what Besu 26.8.0 occasionally returned; see limitation E13). Usage: node tools/nullproxy.mjs <port> <target-url> <N>
import http from "http";
const [, , listen, target, everyN] = process.argv;
let n = 0, injected = 0;
http.createServer((req, res) => {
  let body = ""; req.on("data", c => body += c); req.on("end", async () => {
    let j; try { j = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }
    if (!Array.isArray(j) && j.method === "eth_getBalance" && ++n % Number(everyN) === 0) {
      injected++; res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ jsonrpc: "2.0", id: j.id, result: null }));
    }
    const r = await fetch(target, { method: "POST", headers: { "content-type": "application/json" }, body });
    res.writeHead(r.status, { "content-type": "application/json" }); res.end(await r.text());
  });
}).listen(Number(listen), "127.0.0.1", () => console.log("proxy up"));
process.on("SIGTERM", () => { console.log(`injected ${injected} nulls`); process.exit(0); });
