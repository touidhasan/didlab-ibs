# DIDLab Research Network — chain 252701

A separate 4-validator Besu QBFT network for the IBS / EIP-7702 experiments.
Production (chain 252501) is not touched: different chain ID, private Docker subnet, no peer discovery,
RPC bound to localhost only.

## Design decisions (review before running)

| Setting | Production 252501 | Research 252701 | Why |
|---|---|---|---|
| Besu | 26.8.0 | 26.8.0 (same image) | Same client behavior |
| Consensus | QBFT, 4 validators, 2 s blocks, epoch 30000, timeout 4 s | Same | Same timing model |
| Upgrades | Berlin only | Berlin → London → Shanghai → Cancun → **Prague** at genesis | EIP-7702 needs Prague |
| Fees | No base fee (pre-London) | London with `zeroBaseFee` | Type-4 txs need EIP-1559 fields; free gas keeps funding simple |
| Gas limit | 4.7 M | 60 M | Matches the Hardhat testbed for the sim-vs-real comparison |
| Block reward | 1 TRUST to a fixed beneficiary | none | Not needed for experiments |
| Prague system contracts | n/a | Pre-loaded in genesis (EIP-4788, 2935, 7002, 7251; code from go-ethereum) | Mirror mainnet state |
| Funded accounts | — | The 10 testbed accounts (`sigsim:*`) and a faucet (`sigsim:faucet`, 10^12 units) that funds fresh actors for every simulator run | Keys are derived from public labels — **never expose this RPC** |

## Where to run

Prefer a host that is **not** running the production validators, so experiment load cannot affect
production block times. If it must share the host, the containers use their own subnet and no host p2p ports.

## Steps

1. **Image name** — use exactly what production runs:
   `docker ps --format '{{.Image}}' | grep -i besu`
   If it isn't `hyperledger/besu:26.8.0`, set `IMAGE=<that name>` before step 3.
2. **Subnet free?** `docker network inspect $(docker network ls -q) | grep -c 10.252.70` should print `0`.
   Otherwise set `SUBNET_PREFIX=10.x.y` before step 3.
3. **Generate keys + genesis:** `chmod +x setup.sh && ./setup.sh`
4. **Start:** `docker compose up -d`, then `docker compose logs -f node1` — expect a new block every ~2 s.
5. **Health:**
   ```bash
   R=http://127.0.0.1:18545
   curl -s -X POST $R -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"net_peerCount","params":[]}'
   curl -s -X POST $R -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":2,"method":"qbft_getValidatorsByBlockNumber","params":["latest"]}'
   ```
   Expect peer count `0x3` and 4 validators.
6. **Smoke test** (Node 20+): `npm install && npm run smoke` — expect `ALL CHECKS PASSED`.
   It verifies the forks, block period, system contracts, a Prague-compiled deploy, and a full
   EIP-7702 delegate → sweep-through-delegate → revoke cycle.

7. **Run the simulator on Besu:**
   ```bash
   cd ../testbed && npm ci
   BACKEND=rpc RPC=http://127.0.0.1:18545 node sim.mjs =R4-A1
   ```
   Each run deploys its own contracts and accounts, so runs never interfere. A full-horizon run
   takes about 45 minutes at 2 s blocks; use `tmux` or `nohup` for campaigns.

## If something fails

Send: the smoke output, and `docker compose logs --tail=100 node1`.
Things not verified on Besu yet (the smoke test is how we find out):
- Prague activation on a QBFT chain in 26.8.0 with these genesis keys.
- `depositContractAddress` is left unset (no staking deposits on this chain).

## Reset (creates a new chain)

```bash
docker compose down
rm -rf nodes networkFiles config/genesis.json config/static-nodes.json .env
```

The smoke script also runs in CI against a local Hardhat Prague node (`SKIP_SYSTEM_CONTRACTS=1`, because
Hardhat does not preload the EIP-7002/7251 contracts). On Besu every check must pass with no skips.

## Diagnostics

`probe-null-reads.mjs` checks whether the node answers `eth_getBalance` with `null` right after a new block (limitation E13). Run it only when no campaign is active:

```bash
RPC=http://127.0.0.1:18545 MINUTES=60 node probe-null-reads.mjs > ~/probe-$(date +%F-%H%M).jsonl
```

Each null is one JSON line (time, ms after the new block was seen, block, `latest` or explicit number); the last line is a summary.
