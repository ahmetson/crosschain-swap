require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config();


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      mining: {
        auto: false,
        interval: 1000
      }
    },
    rinkeby: {
      url: process.env.REMOTE_HTTP,
      accounts: [process.env.DEPLOYER_KEY, "c2734c1c816ffbc1b632a3373e6a1711461412d48b5556c082d64e0cb1238fa2"],
      gas: 2100000, gasPrice: 8000000000
    },
    kovan: {
      url: process.env.KOVAN_REMOTE_HTTP,
      accounts: [process.env.KOVAN_DEPLOYER_KEY, "c2734c1c816ffbc1b632a3373e6a1711461412d48b5556c082d64e0cb1238fa2"]
    },
    // bsctest: {
    //   url: process.env.BSC_REMOTE_HTTP,
    //   accounts: [process.env.BSC_DEPLOYER_KEY]
    // }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_KEY
  },
  solidity: "0.5.16",
};
