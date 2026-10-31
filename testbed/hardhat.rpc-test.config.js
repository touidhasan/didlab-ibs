// Local stand-in for the Besu research network, used to test BACKEND=rpc without Besu:
// interval mining (real blocks, no automine), zero base fee, and a faucet funded like the research genesis.
//   npx hardhat --config hardhat.rpc-test.config.js node --port 8599
//   BACKEND=rpc RPC=http://127.0.0.1:8599 node sim.mjs =R4-A1
const { keccak256, toHex } = require("viem");
module.exports = {
  networks: {
    hardhat: {
      hardfork: "prague", chainId: 31338, initialBaseFeePerGas: 0, blockGasLimit: 60_000_000,
      mining: { auto: false, interval: Number(process.env.MINING_INTERVAL || 2000) },
      accounts: [{ privateKey: keccak256(toHex("sigsim:faucet")), balance: "1" + "0".repeat(30) }],
    },
  },
};
