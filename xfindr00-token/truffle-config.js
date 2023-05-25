const HDWalletProvider = require('@truffle/hdwallet-provider');
const infuraKey = "<YOUR INFURA KEY>";
const mnemonic = "16f3f3d5fa6c96a7c928a9eb42e470db290cf2ee674b065d2b5674a45c579945";

module.exports = {
  networks: {
    goerli: {
      provider: () => new HDWalletProvider(mnemonic, `https://goerli.infura.io/v3/${infuraKey}`),
      network_id: 5,       // Goerli's id
      gas: 5500000,        // Gas sent with each transaction (default: ~6700000)
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },

    development: {
        host: "127.0.0.1",
        port: 8545,  // Change this to the port number shown in Ganache
        network_id: "*",  // Match any network id
        gas: 5000000
      },
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.18",    // Fetch exact version from solc-bin (default: truffle's version)
    }
  }
};
