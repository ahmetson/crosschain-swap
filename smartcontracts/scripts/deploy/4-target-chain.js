require('dotenv').config()
const { ethers }              = require("hardhat");

async function main() {
  let deployer        = await ethers.getSigner();
  let chainID         = await deployer.getChainId();

  // We get the contract to deploy
  const Contract = await ethers.getContractFactory("TargetChain");

  const contract = await Contract.deploy();
  
  console.log("TargetChain deployed on ", contract.address, "Deployer: ", deployer.address, "Chain ID: ", chainID);
}
  
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
