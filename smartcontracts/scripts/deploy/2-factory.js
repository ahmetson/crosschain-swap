require('dotenv').config()
const { ethers }              = require("hardhat");
const addr                    = require("../addresses");

async function main() {
  let deployer        = await ethers.getSigner();
  let chainID         = await deployer.getChainId();

  // We get the contract to deploy
  const Factory = await ethers.getContractFactory("Factory");
  // address payable _feeToSetter, uint _targetChainID
  let feeToSetter     = deployer.address;
  let targetChainID   = addr.oppositeOf(chainID);

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Deploying factory on chain id ${chainID} which is paired to chain id ${targetChainID}`);

  const factory = await Factory.deploy(feeToSetter, targetChainID);
  
  console.log("Factory deployed on ", factory.address, "Deployer: ", deployer.address, "Chain ID: ", chainID);
}
  
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
