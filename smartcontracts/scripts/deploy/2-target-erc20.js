require('dotenv').config()
const { ethers }              = require("hardhat");

async function main() {
  let name = "BSC Test 1";
  let name2 = "BSC Test 2";
  let symbol = "BT-1";
  let symbol2 = "BT-2";
  let totalSupply  = ethers.utils.parseEther("10000000");

  let deployer        = await ethers.getSigner();
  let chainID         = await deployer.getChainId();

  // We get the contract to deploy
  const Token = await ethers.getContractFactory("ERC20");
  const token = await Token.deploy(name, symbol, totalSupply);
  const token2 = await Token.deploy(name2, symbol2, totalSupply);
  
  console.log(`Token ${symbol} was deployed on ${token.address} by ${deployer.address} on chain ${chainID}`);
  console.log(`Token ${symbol2} was deployed on ${token2.address} by ${deployer.address} on chain ${chainID}`);
}
  
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
