// Signing-path compromise testbed (Prague EVM).
// Reproduces the Oct 29, 2026 Binance pattern and measures defenses.
// Time unit: 1 step = 1 block (12 s in the incident timeline). t0 = the EIP-7702 delegation (20:20:59 UTC).
//
// Backends:
//   BACKEND=hardhat (default)  in-process Hardhat EDR: automine, setBalance, snapshot/revert between runs
//   BACKEND=rpc  RPC=<url>     any JSON-RPC chain (Besu research network): real blocks, fresh accounts per run
//                              funded from FAUCET_KEY (default keccak256("sigsim:faucet")), 1 step = 1 real block
import solc from "solc";
import fs from "fs";
import {
  createPublicClient, createWalletClient, createTestClient, custom, http, defineChain, encodeFunctionData,
  decodeFunctionData, keccak256, toHex, encodeAbiParameters, zeroAddress, parseEther, getAddress,
  recoverMessageAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

// ---------- backend ----------
const BACKEND = process.env.BACKEND || "hardhat";
if (!["hardhat", "rpc"].includes(BACKEND)) { console.error(`BACKEND must be hardhat or rpc, got ${BACKEND}`); process.exit(2); }
const RPC = process.env.RPC || "http://127.0.0.1:18545";
let transport, chain, test = null;
// State reads that the JSON-RPC spec never answers with null. Besu 26.8.0 did so a few times in
// ~10 h of 2 s blocks (eth_getBalance at "latest"), which killed whole runs (limitation E13).
// Retry those with backoff and count every occurrence so it is reported, not hidden.
const NEVER_NULL = new Set(["eth_getBalance", "eth_getTransactionCount", "eth_getCode", "eth_call", "eth_getStorageAt", "eth_blockNumber", "eth_chainId"]);
const rpcStats = { nullReads: 0, recovered: 0, nullByMethod: {} };
function nullRetry(factory, tries = 8) {
  return opts => {
    const t = factory(opts);
    return { ...t, request: async args => {
      for (let i = 0; ; i++) {
        const r = await t.request(args);
        if ((r !== null && r !== undefined) || !NEVER_NULL.has(args.method)) { if (i) rpcStats.recovered++; return r; }
        rpcStats.nullReads++; rpcStats.nullByMethod[args.method] = (rpcStats.nullByMethod[args.method] || 0) + 1;
        if (i + 1 >= tries) throw new Error(`${args.method} returned null ${tries} times; params ${JSON.stringify(args.params)}`);
        await new Promise(res => setTimeout(res, 50 * 2 ** i));
      }
    } };
  };
}
if (BACKEND === "hardhat") {
  const hre = (await import("hardhat")).default;
  transport = custom(hre.network.provider);
  chain = hardhat;
} else {
  transport = nullRetry(http(RPC, { timeout: 30_000 }));
  const id = await createPublicClient({ transport }).getChainId();
  chain = defineChain({ id, name: `rpc-${id}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
}
const CHAIN_ID = chain.id;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- constants ----------
const ETH_USD = 2300n;            // price used to report losses
const E18 = 10n ** 18n;
const usdOf = (asset, amt) => asset === "ETH" ? Number(amt * ETH_USD / E18) : Number(amt / E18);
const WARMUP = 60;                // blocks of benign traffic before t0
const HORIZON = Number(process.env.HORIZON || 1200);             // blocks after t0 (4 h)
const MANUAL_PAUSE = 570;         // 22:15 UTC: customer withdrawals paused
const MANUAL_REVOKE = 1149;       // 00:10:35 UTC: delegation revoked, access cut

// ---------- compile ----------
const src = fs.readFileSync(new URL("./contracts.sol", import.meta.url), "utf8");
const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity", sources: { "c.sol": { content: src } },
  settings: { evmVersion: "prague", optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
})));
if (out.errors?.some(e => e.severity === "error")) { console.error(out.errors); process.exit(1); }
const art = n => ({ abi: out.contracts["c.sol"][n].abi, bytecode: "0x" + out.contracts["c.sol"][n].evm.bytecode.object });
const STABLE = art("MockStable"), SAFE = art("OperatorSafe"), SWEEPER = art("Sweeper");

// ---------- clients ----------
const pub = createPublicClient({ chain, transport, cacheTime: 0, pollingInterval: 250 });
if (BACKEND === "hardhat") test = createTestClient({ chain, transport, mode: "hardhat" });
const wallet = a => createWalletClient({ chain, transport, account: a });

// Actors. Hardhat keeps the fixed "sigsim:<label>" keys (reproduces earlier results);
// rpc derives fresh keys per run ("sigsim:<runTag>:<label>") because a real chain cannot be rolled back.
const LABELS = { deployer: "deployer", hot14: "hot14", hot16: "hot16", hotB: "hotB", cold: "cold", deposits: "deposits",
  op: "attacker-operator", hub: "attacker-hub", watcher: "watcher-gas", ia: "intent-authority" };
const keys = prefix => Object.fromEntries(Object.entries(LABELS).map(([k, l]) => [k, privateKeyToAccount(keccak256(toHex(prefix + l)))]));
let K = keys("sigsim:");

// Nonce tracking: on a real chain several transactions from one account are in flight within a block,
// so the next nonce is the larger of the node's pending count and what this process has already sent.
const nextNonce = new Map();
async function pending(a) {
  a = getAddress(a);
  // A node can fail to build its pending block while it holds a transaction that is no longer affordable
  // (Hardhat's interval-mined node does, after attacker A9 queues transfers beyond the balance). Then fall back
  // to the mined count, plus what this process has already sent (below); count it so it is reported.
  const c = await pub.getTransactionCount({ address: a, blockTag: "pending" })
    .catch(() => { rpcStats.pendingFallbacks = (rpcStats.pendingFallbacks || 0) + 1; return pub.getTransactionCount({ address: a, blockTag: "latest" }); });
  const l = nextNonce.get(a) ?? 0;
  return c > l ? c : l;
}
const noteNonce = (a, n) => { a = getAddress(a); if (n + 1 > (nextNonce.get(a) ?? 0)) nextNonce.set(a, n + 1); };
let lastTxError = null;
// Send from one of our accounts with a tracked nonce. wait=true blocks until mined (rpc only; Hardhat automines).
async function txFrom(acc, params, { wait = false } = {}) {
  const nonce = await pending(acc.address);
  const h = await wallet(acc).sendTransaction({ ...FEES, ...params, nonce }).catch(e => { lastTxError = e; return null; });
  if (h) noteNonce(acc.address, nonce);
  if (h && wait && BACKEND === "rpc") await pub.waitForTransactionReceipt({ hash: h }).catch(() => null);
  return h;
}
const FEES = { maxFeePerGas: 10n ** 10n, maxPriorityFeePerGas: 0n };

// ---------- deterministic RNG ----------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function lognormal(r, median, sigma) { const u = Math.max(r(), 1e-12), v = r(); return median * Math.exp(sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); }

// ---------- world setup (once, then snapshot) ----------
let W; // addresses
async function setup() {
  await test.setAutomine(true);
  for (const a of Object.values(K)) await test.setBalance({ address: a.address, value: parseEther("10") });
  const dep = wallet(K.deployer);
  const deploy = async (w, c, args) => getAddress((await pub.waitForTransactionReceipt({ hash: await w.deployContract({ ...c, args }) })).contractAddress.toLowerCase());
  const usdt = await deploy(dep, STABLE, ["USDT"]);
  const usdc = await deploy(dep, STABLE, ["USDC"]);
  const safe34 = await deploy(dep, SAFE, [K.hot14.address]);
  const sweeper = await deploy(wallet(K.op), SWEEPER, [K.op.address]); // deployed hours before, as observed
  const mint = async (tok, to, amt) => pub.waitForTransactionReceipt({ hash: await dep.writeContract({ address: tok, abi: STABLE.abi, functionName: "mint", args: [to, amt] }) });
  // Balances shaped on the incident (Ethereum leg).
  await test.setBalance({ address: K.hot14.address, value: 167_464n * E18 });
  await mint(usdt, K.hot14.address, 1_615_000_000n * E18);
  await test.setBalance({ address: K.hot16.address, value: 28_005n * E18 });
  await mint(usdt, K.hot16.address, 108_000_000n * E18);
  await mint(usdt, K.hotB.address, 38_000_000n * E18);          // the 23:05 "second wave" wallet
  await mint(usdc, safe34, 823_000_000n * E18);
  await test.setBalance({ address: K.cold.address, value: 1_000_000n * E18 });
  await mint(usdt, K.cold.address, 10_000_000_000n * E18);
  await test.setBalance({ address: K.deposits.address, value: 100_000n * E18 });
  W = { usdt, usdc, safe34, sweeper };
  // Automine stays on: each tx is validated and mined as sent; a 12 s step can contain several blocks.
  return await test.snapshot();
}

// rpc: fresh actors for one run, funded from the faucet, contracts deployed and balances minted.
async function setupRpc(tag) {
  K = keys(`sigsim:${tag}:`); nextNonce.clear();
  const faucet = privateKeyToAccount(process.env.FAUCET_KEY || keccak256(toHex("sigsim:faucet")));
  const fb = await pub.getBalance({ address: faucet.address });
  if (fb < 2_000_000n * E18) throw new Error(`faucet ${faucet.address} has ${fb / E18} ETH; needs > 2,000,000`);
  const target = { hot14: 167_464n, hot16: 28_005n, cold: 1_000_000n, deposits: 100_000n };
  let last;
  for (const [k, a] of Object.entries(K)) last = await txFrom(faucet, { to: a.address, value: (target[k] ?? 10n) * E18, gas: 21_000n });
  await pub.waitForTransactionReceipt({ hash: last });
  const dep = wallet(K.deployer);
  const deploy = async (w, c, args) => getAddress((await pub.waitForTransactionReceipt({ hash: await w.deployContract({ ...c, args, ...FEES }) })).contractAddress.toLowerCase());
  const usdt = await deploy(dep, STABLE, ["USDT"]);
  const usdc = await deploy(dep, STABLE, ["USDC"]);
  const safe34 = await deploy(dep, SAFE, [K.hot14.address]);
  const sweeper = await deploy(wallet(K.op), SWEEPER, [K.op.address]);
  const mintData = (to, amt) => encodeFunctionData({ abi: STABLE.abi, functionName: "mint", args: [to, amt] });
  const mints = [[usdt, K.hot14.address, 1_615_000_000n], [usdt, K.hot16.address, 108_000_000n], [usdt, K.hotB.address, 38_000_000n],
    [usdc, safe34, 823_000_000n], [usdt, K.cold.address, 10_000_000_000n]];
  for (const [tok, to, units] of mints) last = await txFrom(K.deployer, { to: tok, data: mintData(to, units * E18), gas: 120_000n });
  const rc = await pub.waitForTransactionReceipt({ hash: last });
  if (rc.status !== "success") throw new Error("setup mint failed");
  W = { usdt, usdc, safe34, sweeper };
}

// One step = one block. Hardhat mines an empty block; rpc waits for the chain's next block.
let stepBlock = 0n;
const stepStats = { steps: 0, overruns: 0, maxBlocksPerStep: 0 };
async function closeStep() {
  if (BACKEND === "hardhat") { await test.mine({ blocks: 1 }); return; }
  let bn;
  while ((bn = await pub.getBlockNumber()) <= stepBlock) await sleep(100);
  const adv = Number(bn - stepBlock);
  stepStats.steps++; if (adv > 1) stepStats.overruns++; if (adv > stepStats.maxBlocksPerStep) stepStats.maxBlocksPerStep = adv;
  stepBlock = bn;
}
async function waitBlocks(n) {
  if (BACKEND === "hardhat") { await test.mine({ blocks: n }); return; }
  const target = (await pub.getBlockNumber()) + BigInt(n);
  while ((await pub.getBlockNumber()) < target) await sleep(200);
}

// ---------- intent authority (separate trust domain: user-authenticated withdrawal ledger) ----------
class IntentAuthority {
  constructor() { this.n = 0; this.ledger = []; }
  digest(i) {
    return keccak256(encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "string" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }],
      [BigInt(i.id), i.wallet, i.asset, i.to, i.amount, BigInt(CHAIN_ID)]));
  }
  async issue(wallet, asset, to, amount, src = "user") {
    const i = { id: ++this.n, wallet, asset, to, amount, src };
    i.sig = await K.ia.signMessage({ message: { raw: this.digest(i) } });
    this.ledger.push(i);
    return i;
  }
}

// ---------- signer service (holds hot keys; policy depends on configuration) ----------
const TRANSFER_ABI = [{ type: "function", name: "transfer", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }];
class Signer {
  constructor(cfg, ia, onAlert) {
    this.cfg = cfg; this.ia = ia; this.onAlert = onAlert;
    this.keys = { [K.hot14.address]: K.hot14, [K.hot16.address]: K.hot16, [K.hotB.address]: K.hotB };
    this.frozen = false; this.used = new Set(); this.window = []; this.denials = {};
  }
  deny(reason, who) { const k = `${who}:${reason}`; this.denials[k] = (this.denials[k] || 0) + 1; return { ok: false, reason }; }
  decode(req) {
    if (!req.data || req.data === "0x") return { asset: "ETH", to: getAddress(req.to), amount: req.value };
    const tok = getAddress(req.to);
    const asset = tok === getAddress(W.usdt) ? "USDT" : tok === getAddress(W.usdc) ? "USDC" : null;
    if (!asset) return null;
    try {
      const d = decodeFunctionData({ abi: TRANSFER_ABI, data: req.data });
      if (req.value && req.value > 0n) return null;
      return { asset, to: getAddress(d.args[0]), amount: d.args[1] };
    } catch { return null; }
  }
  async request(req, ctx) {
    const who = ctx.who;
    const key = this.keys[req.wallet];
    if (!key) return this.deny("unknown-wallet", who);
    // Break-glass revocation: only the independent watcher/SOC path, only to the zero address.
    if (req.kind === "auth7702" && ctx.role === "breakglass" && req.delegate === zeroAddress) {
      return { ok: true, auth: await key.signAuthorization({ chainId: CHAIN_ID, contractAddress: zeroAddress, nonce: req.nonce }) };
    }
    if (this.frozen) return this.deny("frozen", who);
    const C = this.cfg;
    if (req.kind === "auth7702") {
      if (C.semantic) { this.onAlert?.("signer:auth7702-requested", who); return this.deny("type-not-allowed", who); }
      return { ok: true, auth: await key.signAuthorization({ chainId: CHAIN_ID, contractAddress: req.delegate, nonce: req.nonce }) };
    }
    // req.kind === "tx"
    let d = null;
    if (C.semantic) {
      d = this.decode(req);
      if (!d) return this.deny("undecodable", who);
      const next = await pending(req.wallet);
      if (req.nonce < next || req.nonce >= next + C.nonceWindow) return this.deny("nonce-window", who);
      const usd = usdOf(d.asset, d.amount);
      if (usd > C.perTxUsd) return this.deny("escalate-manual", who);
      const now = ctx.block;
      this.window = this.window.filter(w => w.block > now - C.windowBlocks);
      const used = this.window.reduce((s, w) => s + w.usd, 0);
      if (used + usd > C.windowUsd) { this.onAlert?.("signer:velocity", who); return this.deny("velocity", who); }
      if (C.intents) {
        const i = req.intent;
        if (!i) { this.onAlert?.("signer:no-intent", who); return this.deny("no-intent", who); }
        const signerAddr = getAddress(await recoverMessageAddress({ message: { raw: this.ia.digest(i) }, signature: i.sig }));
        if (signerAddr !== getAddress(K.ia.address)) { this.onAlert?.("signer:bad-intent", who); return this.deny("bad-intent", who); }
        if (this.used.has(i.id)) { this.onAlert?.("signer:intent-replay", who); return this.deny("intent-replay", who); }
        if (getAddress(i.wallet) !== getAddress(req.wallet) || i.asset !== d.asset || getAddress(i.to) !== d.to || i.amount !== d.amount) {
          this.onAlert?.("signer:intent-mismatch", who); return this.deny("intent-mismatch", who);
        }
        this.used.add(i.id);
      }
      this.window.push({ block: now, usd });
    }
    const raw = await key.signTransaction({ chainId: CHAIN_ID, type: "eip1559", to: req.to, value: req.value || 0n, data: req.data || "0x", nonce: req.nonce, gas: req.gas, ...(req.fees || FEES) });
    return { ok: true, raw };
  }
}

let lastSendError = null;
const send = async (raw, from, nonce) => {
  const h = await pub.request({ method: "eth_sendRawTransaction", params: [raw] }).catch(e => { lastSendError = e?.details || e?.shortMessage || String(e?.message || e); return null; });
  if (h && from !== undefined) noteNonce(from, nonce);
  return h;
};
const bal = async a => ({
  ETH: await pub.getBalance({ address: a }),
  USDT: await pub.readContract({ address: W.usdt, abi: STABLE.abi, functionName: "balanceOf", args: [a] }),
  USDC: await pub.readContract({ address: W.usdc, abi: STABLE.abi, functionName: "balanceOf", args: [a] }),
});
const usdTotal = b => usdOf("ETH", b.ETH) + usdOf("USDT", b.USDT) + usdOf("USDC", b.USDC);

// ---------- one run ----------
async function run({ name, cfg, attacker, seed = 7 }) {
  const r = rng(seed);
  const log = [];
  const ia = new IntentAuthority();
  const state = { alerts: [], detect: null, contain: null, contains: [], paused: false, replenishHalted: false, attackerCut: false, pendingContain: false, unfreezeAt: null, lossAtContain: null };
  let tNow = -WARMUP;
  const clock = { t0Wall: null, t0Block: null };
  // Client txpool size at start and end (rpc only). Stuck transactions from earlier runs stay in Besu's
  // pool across runs (limitation E15), so record it for every run.
  const poolStats = async () => BACKEND === "rpc" ? await pub.request({ method: "txpool_besuStatistics" }).catch(() => null) : null;
  const poolAtStart = await poolStats();
  const stamp = async () => ({ wall: Date.now(), block: await pub.getBlockNumber() });
  const alert = (kind, who) => {
    state.alerts.push({ t: tNow, kind, who });
    if (cfg.watcher) {
      if (state.detect === null) { state.detect = tNow; state.detectAt = { wall: Date.now(), block: stepBlock }; }
      // Tiered response: requests the signer already refused are not breaches; only real outflow anomalies,
      // velocity breaches or intent misuse freeze the signer.
      const soft = ["signer:no-intent", "signer:auth7702-requested"];
      if (cfg.tiered && soft.includes(kind)) { state.softAlerts = (state.softAlerts || 0) + 1; return; }
      if (!signer.frozen) state.pendingContain = true;
    }
  };
  const signer = new Signer(cfg, ia, alert);
  const treasury = [K.hot14.address, K.hot16.address, K.hotB.address].map(a => getAddress(a));
  const watched = new Set([...treasury, getAddress(W.safe34)]);
  const benign = { requested: 0, completed: 0, escalated: 0, blocked: 0, paused: 0 };
  const benignTx = [];   // [hash, t, wallet, asset, amount] for every signed-and-accepted benign withdrawal
  const trace = [];      // TRACE=1: per-step balances, to locate where two runs diverge
  const hubStart = await bal(K.hub.address);
  const atk = { auths: [], mode: attacker ? (attacker.kind === "aware" ? "adaptive" : attacker.kind) : null, vectors: {}, hoard: [] };
  // Counters for the mempool-aware attackers (A3r, A9); absent for the others, so their results are unchanged.
  if (attacker?.replaceStalled || attacker?.prequeue) Object.assign(atk, { ops: { replacements: 0, replaceDenied: 0, replaceRejected: 0,
    prequeued: 0, prequeueDenied: 0, prequeueRejected: 0 }, stall: {}, noQueue: {} });
  let prevBal = {}; for (const a of treasury) prevBal[a] = (await bal(a)).ETH;
  let lastScanned = await pub.getBlockNumber();
  const delegatedBlocks = { count: 0 };

  async function contain() {
    if (signer.frozen) return;
    if (state.contain === null) { state.contain = tNow; state.containAt = await stamp(); state.lossAtContain = usdTotal(await bal(K.hub.address)) - usdTotal(hubStart); }
    state.contains.push(tNow); signer.frozen = true; state.replenishHalted = true;
    if (cfg.recover) state.unfreezeAt = tNow + cfg.recover;
    log.push([tNow, "containment: signer frozen, replenishment halted"]);
    for (const a of treasury) {
      const code = await pub.getCode({ address: a });
      if (code && code !== "0x") await revoke(a, "auto");
    }
  }
  async function revoke(a, why) {
    const n = await pending(a);
    const res = await signer.request({ kind: "auth7702", wallet: a, delegate: zeroAddress, nonce: n }, { role: "breakglass", who: "watcher" });
    await txFrom(K.watcher, { to: K.watcher.address, value: 0n, authorizationList: [res.auth], gas: 100_000n });
    log.push([tNow, `revocation submitted for ${a.slice(0, 8)} (${why})`]);
  }

  // Benign withdrawal through the legitimate pipeline.
  async function benignWithdrawal(w) {
    benign.requested++;
    if (state.paused) { benign.paused++; return; }
    const asset = r() < 0.4 ? "ETH" : "USDT";
    let usd = Math.min(lognormal(r, 3000, 2.0), 5_000_000);
    const to = getAddress(keccak256(toHex("user" + Math.floor(r() * 1e9))).slice(0, 42));
    const amount = asset === "ETH" ? BigInt(Math.floor(usd / Number(ETH_USD) * 1e6)) * 10n ** 12n : BigInt(Math.floor(usd)) * E18;
    const intent = await ia.issue(w, asset, to, amount);
    const nonce = await pending(w);
    const req = asset === "ETH" ? { kind: "tx", wallet: w, to, value: amount, data: "0x", nonce, gas: 50_000n, intent }
      : { kind: "tx", wallet: w, to: W.usdt, value: 0n, data: encodeFunctionData({ abi: TRANSFER_ABI, functionName: "transfer", args: [to, amount] }), nonce, gas: 100_000n, intent };
    const res = await signer.request(req, { role: "service", who: "pipeline", block: tNow });
    if (res.ok) { const h = await send(res.raw, w, nonce); benign.completed++; benignTx.push([h, tNow, w, asset, amount, h ? null : lastSendError]); }
    else if (res.reason === "escalate-manual") benign.escalated++;
    else benign.blocked++;
  }

  // Attacker helpers (holds the compromised service credential).
  const ctxA = () => ({ role: "service", who: "attacker", block: tNow });
  const sweepData = encodeFunctionData({ abi: SWEEPER.abi, functionName: "sweep", args: [K.hub.address, [W.usdt, W.usdc]] });
  async function plainDrain(w, capped) {
    // Request signed transfers of the wallet's balances to the hub (largest allowed first).
    if (state.attackerCut) return;
    const b = await bal(w);
    const asks = [];
    if (b.ETH > 2n * E18) asks.push(["ETH", b.ETH - 2n * E18]);
    if (b.USDT > 0n) asks.push(["USDT", b.USDT]);
    for (let [asset, amt] of asks) {
      let budget = capped ? 40 : 1; // adaptive attacker keeps asking at the cap within one block
      while (budget-- > 0 && amt > 0n) {
        let ask = amt;
        if (capped && cfg.perTxUsd) { const capUnits = asset === "ETH" ? BigInt(Math.floor(cfg.perTxUsd / Number(ETH_USD))) * E18 : BigInt(cfg.perTxUsd) * E18; if (ask > capUnits) ask = capUnits; }
        let intent;
        if (attacker.mintIntents) intent = await ia.issue(w, asset, getAddress(K.hub.address), ask, "attacker");
        const nonce = await pending(w);
        const req = asset === "ETH" ? { kind: "tx", wallet: w, to: K.hub.address, value: ask, data: "0x", nonce, gas: 50_000n, intent }
          : { kind: "tx", wallet: w, to: W.usdt, value: 0n, data: encodeFunctionData({ abi: TRANSFER_ABI, functionName: "transfer", args: [K.hub.address, ask] }), nonce, gas: 100_000n, intent };
        const res = await signer.request(req, ctxA());
        if (!res.ok) break;
        await send(res.raw, w, nonce); amt -= ask; atk.vectors.plain = (atk.vectors.plain || 0) + usdOf(asset, ask);
      }
    }
  }
  // A3r: when a wallet's mined nonce has not moved for STALL_STEPS blocks while transactions wait behind it (a
  // client that admits underfunded transactions holds them, limitation E8), the attacker replaces the stuck nonce
  // with a transfer the wallet can pay for now, and each queued nonce after it (up to CLEAR) with a zero-value
  // transfer, so the whole queue clears in one block. Customer withdrawals in that queue are lost. A nonce's fees
  // double each time it is replaced (at most 8 times), above the client's price bump. A signer whose nonce window
  // starts at the pending nonce refuses the replacements.
  const STALL_STEPS = 2, CLEAR = 40;
  const minedNonce = w => pub.getTransactionCount({ address: w, blockTag: "latest" });
  async function replaceIfStalled(w) {
    const mined = await minedNonce(w), s = atk.stall[w] ??= { nonce: mined, since: tNow, bumps: {} };
    if (mined !== s.nonce) { Object.assign(s, { nonce: mined, since: tNow }); return; }
    const top = await pending(w);
    if (tNow - s.since < STALL_STEPS || top <= mined) return;
    s.since = tNow; // wait another STALL_STEPS blocks before the next attempt
    const eth = (await bal(w)).ETH;
    let value = eth > 2n * E18 ? eth - 2n * E18 : 0n;
    if (cfg.perTxUsd) { const cap = BigInt(Math.floor(cfg.perTxUsd / Number(ETH_USD))) * E18; if (value > cap) value = cap; }
    let done = 0;
    for (let n = mined; n < Math.min(top, mined + CLEAR); n++) {
      const k = (s.bumps[n] = (s.bumps[n] || 0) + 1);
      if (k > 8) continue;
      const f = 2n ** BigInt(k), v = n === mined ? value : 0n;
      const fees = { maxFeePerGas: FEES.maxFeePerGas * f, maxPriorityFeePerGas: 10n ** 9n * f };
      const res = await signer.request({ kind: "tx", wallet: w, to: K.hub.address, value: v, data: "0x", nonce: n, gas: 50_000n, fees }, ctxA());
      if (!res.ok) { atk.ops.replaceDenied++; break; }
      if (await send(res.raw, w, n)) { atk.ops.replacements++; done++; if (v) atk.vectors.replace = (atk.vectors.replace || 0) + usdOf("ETH", v); }
      else atk.ops.replaceRejected++;
    }
    if (done) log.push([tNow, `attacker: replaced ${done} queued nonces of ${w.slice(0, 8)} from ${mined}`]);
  }
  // A9: keeps cap-sized native transfers signed and queued beyond the wallet's balance, so they execute the moment
  // funds arrive, before any watcher sees the block. A client that rejects underfunded transactions refuses them at
  // send; the attacker then stops queueing on that wallet. A signer counts each signature against its budget.
  const QUEUE = 20;
  async function prequeue(w) {
    const slice = BigInt(Math.floor((cfg.perTxUsd || 1_000_000) / Number(ETH_USD))) * E18; // 434 ETH, one cap
    const mined = await minedNonce(w);
    for (let n = await pending(w), tries = 0; n - mined < QUEUE && tries < QUEUE; n++, tries++) {
      const res = await signer.request({ kind: "tx", wallet: w, to: K.hub.address, value: slice, data: "0x", nonce: n, gas: 50_000n }, ctxA());
      if (!res.ok) { atk.ops.prequeueDenied++; return; }
      if (!(await send(res.raw, w, n))) { atk.ops.prequeueRejected++; atk.noQueue[w] = true; log.push([tNow, `attacker: client refused a queued transfer from ${w.slice(0, 8)}; stops queueing there`]); return; }
      atk.ops.prequeued++;
    }
  }
  // A10: collects one nonce window of capped signatures on a wallet without sending them, so nothing moves
  // and nothing alerts. Once the budget window has rolled past them it sends them, then drains with the
  // fresh budget like A3 (tests whether outstanding signatures escape the budget, bound T3).
  async function collectHoard(w) {
    const n0 = await pending(w), b = await bal(w);
    for (let i = 0; i < (cfg.nonceWindow || 4); i++) {
      const asset = b.USDT > 0n ? "USDT" : "ETH";
      let ask = asset === "ETH" ? b.ETH - 2n * E18 : b.USDT;
      if (cfg.perTxUsd) { const cap = asset === "ETH" ? BigInt(Math.floor(cfg.perTxUsd / Number(ETH_USD))) * E18 : BigInt(cfg.perTxUsd) * E18; if (ask > cap) ask = cap; }
      const intent = attacker.mintIntents ? await ia.issue(w, asset, getAddress(K.hub.address), ask, "attacker") : undefined;
      const req = asset === "ETH" ? { kind: "tx", wallet: w, to: K.hub.address, value: ask, data: "0x", nonce: n0 + i, gas: 50_000n, intent }
        : { kind: "tx", wallet: w, to: W.usdt, value: 0n, data: encodeFunctionData({ abi: TRANSFER_ABI, functionName: "transfer", args: [K.hub.address, ask] }), nonce: n0 + i, gas: 100_000n, intent };
      const res = await signer.request(req, ctxA());
      if (!res.ok) break;
      atk.hoard.push([res.raw, w, n0 + i, usdOf(asset, ask)]);
    }
    log.push([tNow, `attacker: holding ${atk.hoard.length} signed transfers from ${w.slice(0, 8)} unsent`]);
  }
  async function delegated() { const c = await pub.getCode({ address: K.hot14.address }); return c && c.toLowerCase().includes(W.sweeper.slice(2).toLowerCase()); }
  async function ensureDelegation() {
    if (await delegated()) return true;
    if (state.attackerCut || !atk.auths.length) return false; // 7702 path never worked: nothing to retry
    const N = await pending(K.hot14.address); const auths = [];
    for (let i = 0; i < 5; i++) { const res = await signer.request({ kind: "auth7702", wallet: K.hot14.address, delegate: W.sweeper, nonce: N + i }, ctxA()); if (res.ok) auths.push(res.auth); else break; }
    if (!auths.length) return false;
    await txFrom(K.op, { to: K.op.address, data: "0x", authorizationList: auths, gas: 400_000n }, { wait: true });
    log.push([tNow, "attacker: re-delegated Binance 14"]);
    return await delegated();
  }
  async function sweep() { if (await ensureDelegation()) await txFrom(K.op, { to: K.hot14.address, data: sweepData, gas: 400_000n }); }
  async function pull(amount) {
    if (!(await ensureDelegation())) return;
    const data = encodeFunctionData({ abi: SWEEPER.abi, functionName: "pull", args: [W.safe34, W.usdc, K.hub.address, amount] });
    await txFrom(K.op, { to: K.hot14.address, data, gas: 200_000n });
  }

  // Exchange automation (deposit sweeps and hot-wallet replenishment), scripted from the incident.
  const inflows = { 200: ["ETH", 1_700n], 400: ["ETH", 370n], 411: ["USDT", 200_000_000n], 1070: ["ETH", 2_962n] };

  // Pre-signed blitz needs signatures collected before any outflow.
  let blitz = [];

  stepBlock = await pub.getBlockNumber();
  const progressEvery = Number(process.env.PROGRESS || 0);
  for (tNow = -WARMUP; tNow <= HORIZON; tNow++) {
    if (progressEvery && (tNow + WARMUP) % progressEvery === 0)
      console.log(JSON.stringify({ progress: { run: name, step: tNow + WARMUP, of: HORIZON + WARMUP + 1, t: tNow } }));
    if (tNow === 0) Object.assign(clock, { t0Wall: Date.now(), t0Block: stepBlock });
    if (state.unfreezeAt === tNow && !state.attackerCut) { signer.frozen = false; state.replenishHalted = false; state.unfreezeAt = null; log.push([tNow, "recovery: signer unfrozen (attacker not yet evicted)"]); }
    if (tNow === MANUAL_REVOKE + 1) { signer.frozen = false; state.paused = false; state.replenishHalted = false; log.push([tNow, "eviction complete: operations resume"]); }
    // --- legitimate traffic
    if (r() < 0.9) await benignWithdrawal(K.hot14.address);
    if (r() < 0.15) await benignWithdrawal(K.hot16.address);
    // --- exchange automation
    const inf = inflows[tNow];
    if (inf && !state.replenishHalted) {
      const [asset, units] = inf;
      if (asset === "ETH") await txFrom(K.deposits, { to: K.hot14.address, value: units * E18, gas: 60_000n });
      else await txFrom(K.cold, { to: W.usdt, data: encodeFunctionData({ abi: TRANSFER_ABI, functionName: "transfer", args: [K.hot14.address, units * E18] }), gas: 100_000n });
    }
    // --- manual SOC response (incident timeline), applies to every configuration
    if (tNow === MANUAL_PAUSE) { state.paused = true; log.push([tNow, "manual: customer withdrawals paused"]); }
    if (tNow === MANUAL_REVOKE) {
      state.attackerCut = true; signer.frozen = true; state.replenishHalted = true;
      if (await delegated()) await revoke(K.hot14.address, "manual");
      log.push([tNow, "manual: access cut, signer frozen"]);
    }
    // --- attacker schedule (offsets from the incident)
    if (attacker && !state.attackerCut) {
      if (tNow === -16 && attacker.kind !== "aware" && attacker.kind !== "hoard") {
        const N = await pending(K.hot14.address);
        for (let i = 0; i < 50; i++) {
          const res = await signer.request({ kind: "auth7702", wallet: K.hot14.address, delegate: W.sweeper, nonce: N + i }, ctxA());
          if (res.ok) atk.auths.push(res.auth); else break;
        }
        if (!atk.auths.length) { atk.mode = "adaptive"; log.push([tNow, "attacker: 7702 path denied, switching to capped plain transfers"]); }
        else log.push([tNow, `attacker: obtained ${atk.auths.length} authorizations for nonces ${N}..${N + atk.auths.length - 1}`]);
      }
      if (attacker.kind === "blitz" && tNow === 0 && atk.mode !== "adaptive") {
        // Collect plain-transfer signatures for other wallets before anything moves.
        for (const w of [K.hot16.address, K.hotB.address]) {
          const b = await bal(w); let n = await pending(w);
          const asks = []; if (b.ETH > 2n * E18) asks.push({ to: K.hub.address, value: b.ETH - 2n * E18, data: "0x", gas: 50_000n });
          if (b.USDT > 0n) asks.push({ to: W.usdt, value: 0n, data: encodeFunctionData({ abi: TRANSFER_ABI, functionName: "transfer", args: [K.hub.address, b.USDT] }), gas: 100_000n });
          for (const a of asks) { const res = await signer.request({ kind: "tx", wallet: w, nonce: n, ...a }, ctxA()); if (res.ok) { blitz.push([res.raw, w, n]); n++; } }
        }
      }
      if (atk.mode === "hoard") {
        const release = (cfg.windowBlocks || 0) + 1;
        if (tNow === 0) await collectHoard(K.hotB.address); // hotB has no other traffic that could use its nonces
        if (tNow === release) {
          for (const [raw, w, n, usd] of atk.hoard) if (await send(raw, w, n)) atk.vectors.hoard = (atk.vectors.hoard || 0) + usd;
          log.push([tNow, `attacker: sent ${atk.hoard.length} held transfers`]);
        }
        if (tNow >= release) for (const w of [K.hot14.address, K.hot16.address, K.hotB.address]) await plainDrain(w, true);
      } else if (atk.mode !== "adaptive") {
        if (tNow === 0 && atk.auths.length) {
          const atomic = attacker.kind === "blitz";
          const nBefore = await pending(K.hot14.address);
          // Pre-signed drains go out in the same block as the delegation (rpc) or right after it (Hardhat automine).
          if (BACKEND === "rpc") for (const [raw, w, n] of blitz) await send(raw, w, n);
          const dh = await txFrom(K.op, { to: atomic ? K.hot14.address : K.op.address, data: atomic ? sweepData : "0x", authorizationList: atk.auths, gas: 3_500_000n }, { wait: true });
          if (!dh) log.push([tNow, "delegation tx error " + (lastTxError?.shortMessage || "")]);
          const nAfter = await pub.getTransactionCount({ address: K.hot14.address, blockTag: "latest" });
          log.push([tNow, `Binance 14 nonce ${nBefore} -> ${nAfter}: ${nAfter - nBefore} authorizations applied`]);
          if (BACKEND === "hardhat") for (const [raw, w, n] of blitz) await send(raw, w, n);
          log.push([tNow, `attacker: delegation tx submitted${atomic ? " with atomic sweep + pre-signed drains" : ""}`]);
        }
        if ([17, 217, 416, 691, 1076].includes(tNow)) await sweep();
        if (tNow === 101) await pull(780_000_000n * E18);
        if (tNow === 195) await pull(43_000_000n * E18);
        if (tNow === 19 && attacker.kind !== "blitz") await plainDrain(K.hot16.address, false);
        if (tNow === 884) await plainDrain(K.hotB.address, false);
      } else if (tNow >= 0) {
        // Adaptive attacker: capped plain transfers from every hot wallet, every block.
        // A3r first replaces a stalled nonce; A9 then tops up its queue of transfers beyond the balance.
        for (const w of [K.hot14.address, K.hot16.address, K.hotB.address]) {
          if (attacker.replaceStalled) await replaceIfStalled(w);
          await plainDrain(w, true);
          if (attacker.prequeue && !atk.noQueue[w]) await prequeue(w);
        }
      }
    }

    // --- close the step (one block marks the passage of time)
    await closeStep();
    const bn = await pub.getBlockNumber();
    if (process.env.TRACE) trace.push({ t: tNow, block: Number(bn),
      hubETH: (await pub.getBalance({ address: K.hub.address })).toString(),
      hot14ETH: (await pub.getBalance({ address: K.hot14.address })).toString(),
      hot16ETH: (await pub.getBalance({ address: K.hot16.address })).toString(),
      hot14Nonce: await pub.getTransactionCount({ address: K.hot14.address }) });

    // --- independent watcher (C4): tripwires + reconciliation against the intent ledger
    if (await delegated()) delegatedBlocks.count++;
    if (cfg.watcher) {
      const txs = [];
      for (let b = lastScanned + 1n; b <= bn; b++) txs.push(...(await pub.getBlock({ blockNumber: b, includeTransactions: true })).transactions);
      const open = new Map();
      for (const i of ia.ledger) if (!i.matched) { const k = `${getAddress(i.wallet)}|${i.asset}|${getAddress(i.to)}|${i.amount}`; if (!open.has(k)) open.set(k, []); open.get(k).push(i); }
      const match = (w, asset, to, amt) => { const k = `${w}|${asset}|${getAddress(to)}|${amt}`; const l = open.get(k); if (l && l.length) { l.shift().matched = true; return true; } return false; };
      const nativeOut = {}, nativeIn = {};
      for (const tx of txs) {
        const from = getAddress(tx.from), to = tx.to ? getAddress(tx.to) : null;
        if (to && watched.has(to) && tx.value > 0n) nativeIn[to] = (nativeIn[to] || 0n) + tx.value;
        if (watched.has(from) && tx.value > 0n) {
          if (match(from, "ETH", to, tx.value)) nativeOut[from] = (nativeOut[from] || 0n) + tx.value;
          else alert("watch:unexplained-native-tx", "chain");
        }
      }
      const logs = await pub.getLogs({ address: [W.usdt, W.usdc], fromBlock: lastScanned + 1n, toBlock: bn });
      for (const lg of logs) {
        const from = getAddress("0x" + lg.topics[1].slice(26)), to = getAddress("0x" + lg.topics[2].slice(26));
        if (!watched.has(from)) continue;
        const asset = getAddress(lg.address) === getAddress(W.usdt) ? "USDT" : "USDC";
        const amt = BigInt(lg.data);
        if (!match(from, asset, to, amt)) alert("watch:unexplained-token-outflow", "chain");
      }
      for (const a of treasury) {
        const cur = (await bal(a)).ETH;
        const unexplained = prevBal[a] + (nativeIn[a] || 0n) - cur - (nativeOut[a] || 0n);
        if (unexplained > E18 / 10n) alert("watch:unexplained-native-drop", "chain");
        prevBal[a] = cur;
        const code = await pub.getCode({ address: a });
        if (code && code !== "0x") alert("watch:code-at-treasury-eoa", "chain");
      }
      lastScanned = bn;
      if (state.pendingContain) { state.pendingContain = false; await contain(); lastScanned = await pub.getBlockNumber(); for (const a of treasury) prevBal[a] = (await bal(a)).ETH; }
    } else {
      for (const a of treasury) prevBal[a] = (await bal(a)).ETH;
    }
  }
  await waitBlocks(2);
  const hubEnd = await bal(K.hub.address);
  // Benign withdrawals that actually landed: "completed" counts signed-and-sent; on a real chain some may fail or never be mined.
  const landed = { success: 0, reverted: 0, missing: 0, rejectedAtSend: 0, rejectReasons: {}, failedList: [] };
  for (const [h, t, w, asset, amount, reason] of benignTx) {
    if (!h) {
      landed.rejectedAtSend++; const why = String(reason || "unknown").slice(0, 160);
      landed.rejectReasons[why] = (landed.rejectReasons[why] || 0) + 1;
      landed.failedList.push({ t, w, asset, amount: amount.toString(), why: "rejected-at-send", reason: why }); continue;
    }
    const rc = await pub.getTransactionReceipt({ hash: h }).catch(() => null);
    if (!rc) { landed.missing++; landed.failedList.push({ t, w, asset, amount: amount.toString(), why: "missing" }); }
    else if (rc.status === "success") landed.success++;
    else { landed.reverted++; landed.failedList.push({ t, w, asset, amount: amount.toString(), why: "reverted", block: Number(rc.blockNumber) }); }
  }
  const loss = { ETH: hubEnd.ETH - hubStart.ETH, USDT: hubEnd.USDT - hubStart.USDT, USDC: hubEnd.USDC - hubStart.USDC };
  const lossUsd = usdTotal(loss);
  const firstAttackAlert = state.alerts.find(a => a.t >= -16);
  const falseAlerts = state.alerts.filter(a => a.t < -16 || (!attacker)).length;
  return {
    name, config: cfg.label, attacker: attacker ? attacker.label : "none (benign only)",
    lossUsd, loss: Object.fromEntries(Object.entries(loss).map(([k, v]) => [k, Number(v / E18)])),
    detectT: state.detect, containT: state.contain, containments: state.contains.length, lossAtFirstContainUsd: state.lossAtContain, delegatedBlocks: delegatedBlocks.count,
    alertsDuringAttack: state.alerts.filter(a => a.t >= -16).length, falseAlerts, firstAlert: firstAttackAlert?.kind || null,
    benign, benignLanded: landed, signerDenials: signer.denials, log, alerts: state.alerts.slice(0, 8),
    attackerOps: atk.ops, attackerVectors: atk.ops || atk.mode === "hoard" ? atk.vectors : undefined,
    trace: process.env.TRACE ? trace : undefined,
    timing: BACKEND === "rpc" ? {
      t0Block: Number(clock.t0Block),
      detectBlocksAfterT0: state.detectAt && clock.t0Block !== null ? Number(state.detectAt.block - clock.t0Block) : null,
      detectSecAfterT0: state.detectAt && clock.t0Wall ? (state.detectAt.wall - clock.t0Wall) / 1000 : null,
      containBlocksAfterT0: state.containAt && clock.t0Block !== null ? Number(state.containAt.block - clock.t0Block) : null,
      containSecAfterT0: state.containAt && clock.t0Wall ? (state.containAt.wall - clock.t0Wall) / 1000 : null,
      steps: { ...stepStats },
      rpc: JSON.parse(JSON.stringify(rpcStats)),
      txpool: { atStart: poolAtStart, atEnd: await poolStats() },
    } : undefined,
  };
}

// ---------- experiment matrix ----------
const CFG = {
  R0: { label: "R0 Baseline (sign on request, manual response)", semantic: false, intents: false, watcher: false },
  R1: { label: "R1 Semantic policy at signer (C2+C3)", semantic: true, intents: false, watcher: false, nonceWindow: 4, perTxUsd: 1_000_000, windowUsd: 25_000_000, windowBlocks: 300 },
  R2: { label: "R2 Autonomous containment only (C4)", semantic: false, intents: false, watcher: true },
  R3: { label: "R3 Semantic policy + containment (C2+C3+C4)", semantic: true, intents: false, watcher: true, nonceWindow: 4, perTxUsd: 1_000_000, windowUsd: 25_000_000, windowBlocks: 300 },
  R4: { label: "R4 Full intent-bound signing (C1+C2+C3+C4)", semantic: true, intents: true, watcher: true, nonceWindow: 4, perTxUsd: 1_000_000, windowUsd: 25_000_000, windowBlocks: 300 },
};
const ATK = {
  A1: { label: "A1 Binance-paced replay (incident schedule)", kind: "paced" },
  A2: { label: "A2 Blitz (atomic delegation+sweep, drains signed and sent in one block)", kind: "blitz" },
  A3: { label: "A3 Policy-aware (no EIP-7702; max-size plain transfers every block)", kind: "aware" },
  A4: { label: "A4 Policy-aware + intent authority also compromised", kind: "aware", mintIntents: true },
  A3r: { label: "A3r Policy-aware + replaces a stalled nonce (mempool-aware)", kind: "aware", replaceStalled: true },
  A9: { label: "A9 Mempool-aware (cap-sized native transfers kept queued beyond the balance)", kind: "aware", prequeue: true },
  A10: { label: "A10 Hoarding (holds one nonce window of signatures past the budget window, then drains)", kind: "hoard" },
  A10i: { label: "A10i Hoarding + intent authority also compromised", kind: "hoard", mintIntents: true },
};

let unhandled = 0;
process.on("unhandledRejection", e => { unhandled++; if (unhandled <= 3) console.error("unhandled:", (e?.details || e?.message || String(e)).slice(0, 160)); });
const only = process.argv[2];
const plan = [];
for (const c of ["R0", "R1", "R2", "R3", "R4"]) for (const a of ["A1", "A2", "A3"]) plan.push([c, a]);
plan.push(["R4", "A4"], ["R0", null], ["R1", null], ["R2", null], ["R3", null], ["R4", null]);
// E3 tiered response for full IBS: refused requests raise alerts but do not freeze legitimate signing.
CFG.R4t = { ...CFG.R4, label: "R4t Full IBS with tiered response", tiered: true };
for (const a of ["A1", "A2", "A3", "A4", null]) plan.push(["R4t", a]);
// E2 robustness: signer unfrozen 30 min after containment while the attacker keeps access.
for (const c of ["R2", "R3", "R4"]) { CFG[c + "p"] = { ...CFG[c], label: CFG[c].label + " + early unfreeze (30 min)", recover: 150 }; for (const a of ["A1", "A3"]) plan.push([c + "p", a]); }
plan.push(["R4p", "A4"]);
// Mempool-aware attackers (limitation E8): A3r replaces a stalled nonce, A9 queues transfers ahead of the funds.
for (const c of ["R0", "R1", "R2", "R3", "R4"]) for (const a of ["A3r", "A9"]) plan.push([c, a]);
// Hoarding (bound T3): signatures held across a budget window.
for (const c of ["R1", "R3", "R4"]) plan.push([c, "A10"]);
plan.push(["R4", "A10i"]);
if (only === "--list") {
  console.log(JSON.stringify({
    configs: Object.fromEntries(Object.entries(CFG).map(([k, v]) => [k, v.label])),
    attackers: Object.fromEntries(Object.entries(ATK).map(([k, v]) => [k, v.label])),
    runs: plan.map(([c, a]) => `${c}-${a || "benign"}`),
    defaults: { horizon: HORIZON, warmup: WARMUP },
  }));
  process.exit(0);
}
const SEEDS = (process.env.SEEDS || "7").split(",").map(Number);
const meta = { backend: BACKEND, chainId: CHAIN_ID, horizon: HORIZON, seeds: SEEDS, started: new Date().toISOString(),
  client: await pub.request({ method: "web3_clientVersion" }).catch(() => null), rpc: BACKEND === "rpc" ? RPC : null };
console.log(`backend=${BACKEND} chain=${CHAIN_ID} client=${meta.client} horizon=${HORIZON} seeds=${SEEDS.join(",")}`);
let snap = BACKEND === "hardhat" ? await setup() : null;
const results = [];
for (const [c, a] of plan) for (const seed of SEEDS) {
  const id = `${c}-${a || "benign"}`;
  if (only && only.startsWith("=") && id !== only.slice(1)) continue;
  if (only && !only.startsWith("=") && !id.startsWith(only)) continue;
  nextNonce.clear();
  if (BACKEND === "hardhat") { await test.revert({ id: snap }); snap = await test.snapshot(); }
  else { Object.assign(stepStats, { steps: 0, overruns: 0, maxBlocksPerStep: 0 }); Object.assign(rpcStats, { nullReads: 0, recovered: 0, nullByMethod: {} }); await setupRpc(`${id}-s${seed}-${Date.now()}`); }
  const t = Date.now();
  const res = await run({ name: id, cfg: CFG[c], attacker: a ? ATK[a] : null, seed });
  res.seed = seed; res.runtimeSec = Math.round((Date.now() - t) / 1000);
  results.push(res);
  const tm = res.timing ? `  t+${res.timing.detectSecAfterT0 ?? "-"}s/${res.timing.containSecAfterT0 ?? "-"}s overruns ${res.timing.steps.overruns}/${res.timing.steps.steps}` : "";
  console.log(`${id.padEnd(10)} s${seed} loss $${(res.lossUsd / 1e6).toFixed(1)}M  detect ${res.detectT} contain ${res.containT} delegated ${res.delegatedBlocks}b  benign ${JSON.stringify(res.benign)}${tm}  ${res.runtimeSec}s`);
}
const tag = [BACKEND === "rpc" ? "rpc" : null, only || null].filter(Boolean).join("-");
meta.finished = new Date().toISOString();
const outPath = process.env.OUT || new URL(`./results${tag ? "-" + tag : ""}.json`, import.meta.url);
fs.writeFileSync(outPath, JSON.stringify({ meta, results }, null, 2));
process.exit(0);
