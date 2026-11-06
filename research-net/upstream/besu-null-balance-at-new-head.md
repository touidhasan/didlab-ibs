# Draft upstream report: Besu returns `null` from `eth_getBalance` for the block it just reported

Status: **draft, not filed.** File it in the Besu GitHub repository (`besu-eth/besu`) after a search there for an
existing report. The text below is self-contained; it does not name this project or its research, and it shares
only a private test network's behaviour.

---

**Title:** `eth_getBalance` returns `null` for a few milliseconds after `eth_blockNumber` reports a new block (QBFT)

**Description**

On a private QBFT network, `eth_getBalance` sometimes returns `"result": null` for an existing, funded account.
It happens only within 0–7 ms after `eth_blockNumber` first reports a new block N, and it happens both for
`"latest"` and for the explicit block number N. For those few milliseconds the node reports N as its head, but
cannot serve state at N, and answers with `null` instead of the balance or an error.

`null` is not a valid result here. The execution-apis specification gives the result as a hex quantity. Clients
read `null` as "no data" or crash on it. Besu's own transaction pool appears to hit the same condition: the node
log contains occasional `SenderBalanceChecker` warnings about failing to read balances at the chain head. We have
not matched those warnings to the probe's timestamps.

**Environment**

- Besu `26.8.0` (`besu/v26.8.0/linux-x86_64/openjdk-java-25`), official Docker image.
- 4 validators, QBFT, 2 s block period, default data storage format.
- `--sync-mode=FULL`, `--discovery-enabled=false`, static nodes.
- Prague active.
- Host: Ubuntu 24.04 VM (4 vCPU, 16 GB) on Proxmox.
- Load: the network was idle apart from the probe below.

**Steps to reproduce**

Run this against one node's RPC for a few hours. It polls `eth_blockNumber` every 20 ms. On every new block it
reads one account's balance 20 times at `"latest"` and 20 times at the new block number, and prints every `null`.

```js
// node probe.mjs   (Node 18+; set RPC, ADDR, MINUTES)
const RPC = process.env.RPC || "http://127.0.0.1:8545";
const ADDR = process.env.ADDR;                // any funded account
const MINUTES = Number(process.env.MINUTES || 360), REPEAT = 20, POLL_MS = 20;
let id = 0;
const rpc = async (method, params = []) => {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message); return j.result;
};
const end = Date.now() + MINUTES * 60_000; let last = null, blocks = 0, reads = 0, nulls = 0;
while (Date.now() < end) {
  const bn = await rpc("eth_blockNumber").catch(() => null);
  if (bn && bn !== last) {
    last = bn; blocks++; const seenAt = Date.now();
    for (let k = 0; k < REPEAT; k++) for (const tag of ["latest", bn]) {
      reads++;
      if ((await rpc("eth_getBalance", [ADDR, tag])) === null) { nulls++;
        console.log(JSON.stringify({ at: new Date().toISOString(), msAfterNewBlock: Date.now() - seenAt,
          block: parseInt(bn, 16), tag: tag === "latest" ? "latest" : "number" })); }
    }
  }
  await new Promise(r => setTimeout(r, POLL_MS));
}
console.log(JSON.stringify({ blocks, reads, nulls }));
```

**Expected:** once a node reports block N, `eth_getBalance(addr, N)` and `eth_getBalance(addr, "latest")` return
the balance, or an error if state is genuinely unavailable. They never return `null`.

**Actual:** two 6-hour runs on the same network:

| | Run 1 | Run 2 |
|---|---|---|
| Reads | 432,040 | 432,040 |
| `null` results | 113 (62 at `latest`, 51 at the block number) | 72 (43 / 29) |
| Blocks affected | 15 of 10,801 | 20 of 10,801 |
| Time after the new block was first seen | 0–7 ms | 0–7 ms |
| RPC errors | 0 | 0 |

The affected blocks cluster at the same seconds of the minute (:17 and :47) in both runs. That happened even
though the nodes were restarted between the runs and the block-to-second alignment shifted. Periodic load on the
machine therefore seems to widen the window, but the window itself is in the node. Example record:

```
{"at":"2026-11-05T15:50:23.007Z","msAfterNewBlock":1,"block":207157,"tag":"latest"}
```

followed by 8 more `null` reads of the same block within the next 6 ms, at both `latest` and `0x32935`.

**Notes**

- **Hardware was ruled out.** The host CPU (Intel Core i9-13900K) has a known stability issue, so run 2 was made
  with turbo boost disabled. The result was unchanged.
- **Related issue.** #6926 asks for an error instead of `null`/default values when Bonsai state is beyond the
  historical limit. This report is about the chain head, not old blocks.
- **Workaround.** Clients can retry a `null` state read after a few milliseconds; every `null` we saw cleared
  that way.

---

Before filing, check:
- that no newer Besu release fixes this (re-run the probe on the newest release if one exists);
- that the example record and table match the files in `../results/`.
