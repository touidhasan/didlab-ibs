// Smoke test for the DIDLab research network (chain 252701).
// Checks: chain identity, fork activation (London/Shanghai/Cancun/Prague), block period,
// Prague system contracts, contract deploy compiled for Prague, and a full EIP-7702 cycle:
// delegate an EOA -> operator sweeps through the delegated code -> revoke with the zero address.
// Usage:  npm install && node smoke7702.mjs
// Env:    RPC (default http://127.0.0.1:18545), CHAIN_ID (default 252701), FUNDER_KEY (default testbed deployer key),
//         SKIP_SYSTEM_CONTRACTS=1 to report (not fail) missing 7002/7251 contracts, e.g. on a Hardhat node
import solc from "solc";
import fs from "fs";
import {
  createPublicClient, createWalletClient, http, defineChain, keccak256, toHex,
  parseEther, formatEther, zeroAddress, concat, getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.RPC || "http://127.0.0.1:18545";
const CHAIN_ID = Number(process.env.CHAIN_ID || 252701);
const FUNDER_KEY = process.env.FUNDER_KEY || keccak256(toHex("sigsim:deployer"));

const chain = defineChain({
  id: CHAIN_ID, name: "DIDLab Research",
  nativeCurrency: { name: "TRUST", symbol: "TRUST", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const transport = http(RPC);
const pub = createPublicClient({ chain, transport, cacheTime: 0 });
const funder = privateKeyToAccount(FUNDER_KEY);
const fw = createWalletClient({ chain, transport, account: funder });

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
};
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const rawBlock = n => pub.request({ method: "eth_getBlockByNumber", params: [n, false] });

// 1. Identity
const cid = await pub.getChainId();
ok("chain id", cid === CHAIN_ID, `got ${cid}, expected ${CHAIN_ID}`);
info("client", await pub.request({ method: "web3_clientVersion" }));

// 2. Forks, read from the raw header
const head = await rawBlock("latest");
ok("London active (baseFeePerGas present)", head.baseFeePerGas !== undefined, `baseFee=${head.baseFeePerGas}`);
ok("Shanghai active (withdrawalsRoot present)", head.withdrawalsRoot !== undefined);
ok("Cancun active (parentBeaconBlockRoot present)", head.parentBeaconBlockRoot !== undefined);
ok("Prague active (requestsHash present)", head.requestsHash !== undefined);

// 3. Block period over the last 20 blocks
const n = BigInt(head.number);
if (n > 20n) {
  const old = await rawBlock(toHex(n - 20n));
  const period = (Number(head.timestamp) - Number(old.timestamp)) / 20;
  info("block period", `${period.toFixed(2)} s (genesis setting: 2 s)`);
} else info("block period", "fewer than 20 blocks so far; re-run later");

// 4. Prague/Cancun system contracts
const SYS = {
  "EIP-4788 beacon roots": "0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02",
  "EIP-2935 history storage": "0x0000F90827F1C53a10cb7A02335B175320002935",
  "EIP-7002 withdrawal requests": "0x00000961Ef480Eb55e80D19ad83579A64c007002",
  "EIP-7251 consolidation requests": "0x0000BBdDc7CE488642fb579F8B00f3a590007251",
};
for (const [k, a] of Object.entries(SYS)) {
  const code = await pub.getCode({ address: a });
  const present = !!code && code !== "0x", bytes = `${code ? (code.length - 2) / 2 : 0} bytes`;
  if (!present && process.env.SKIP_SYSTEM_CONTRACTS) info(`system contract ${k}`, `absent (${bytes}), skipped`);
  else ok(`system contract ${k}`, present, bytes);
}

// 5. Funder balance
const bal = await pub.getBalance({ address: funder.address });
ok("funder has balance", bal > parseEther("10"), `${funder.address} ${formatEther(bal)}`);

// 6. Deploy the testbed Sweeper compiled for Prague (uses PUSH0 etc.)
const src = fs.readFileSync(new URL("../testbed/contracts.sol", import.meta.url), "utf8");
const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity", sources: { "c.sol": { content: src } },
  settings: { evmVersion: "prague", optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
})));
if (out.errors?.some(e => e.severity === "error")) { console.error(out.errors); process.exit(2); }
const SW = out.contracts["c.sol"].Sweeper;
const timed = async (label, hashP) => {
  const sent = await pub.getBlockNumber();
  const t0 = Date.now();
  const r = await pub.waitForTransactionReceipt({ hash: await hashP, pollingInterval: 250 });
  info(label, `status=${r.status} block=${r.blockNumber} (+${r.blockNumber - sent} blocks, ${((Date.now() - t0) / 1000).toFixed(1)} s) gas=${r.gasUsed}`);
  return r;
};
const dep = await timed("deploy Sweeper", fw.deployContract({ abi: SW.abi, bytecode: "0x" + SW.evm.bytecode.object, args: [funder.address] }));
ok("contract deployed (Prague bytecode)", dep.status === "success" && !!dep.contractAddress);
const sweeper = getAddress(dep.contractAddress);

// 7. Fresh EOA, funded with 2 TRUST
const eoa = privateKeyToAccount(keccak256(toHex("smoke:eoa:" + Date.now())));
await timed("fund EOA", fw.sendTransaction({ to: eoa.address, value: parseEther("2") }));
const ew = createWalletClient({ chain, transport, account: eoa });

// 8. EIP-7702 delegation (signed by the EOA, sent and paid for by the funder)
const auth = await ew.signAuthorization({ contractAddress: sweeper });
const r1 = await timed("type-4 delegate", fw.sendTransaction({ authorizationList: [auth], to: eoa.address, data: "0x" }));
const code1 = (await pub.getCode({ address: eoa.address })) || "0x";
const expect = concat(["0xef0100", sweeper]).toLowerCase();
ok("EOA code is 0xef0100||delegate", code1.toLowerCase() === expect, code1);
ok("delegation tx type is 0x4", (await pub.getTransaction({ hash: r1.transactionHash })).type === "eip7702");

// 9. Operator sweeps through the delegated code (the incident's mechanism)
await timed("sweep via delegated code", fw.writeContract({ address: eoa.address, abi: SW.abi, functionName: "sweep", args: [funder.address, []] }));
const left = await pub.getBalance({ address: eoa.address });
ok("sweep left exactly 1 TRUST", left === parseEther("1"), formatEther(left));

// 10. Revoke: authorization to the zero address clears the code
const auth0 = await ew.signAuthorization({ contractAddress: zeroAddress });
await timed("type-4 revoke", fw.sendTransaction({ authorizationList: [auth0], to: eoa.address, data: "0x" }));
const code2 = (await pub.getCode({ address: eoa.address })) || "0x";
ok("EOA code cleared after revoke", code2 === "0x", code2);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
