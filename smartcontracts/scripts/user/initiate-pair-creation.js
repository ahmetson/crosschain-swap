const { ethers }              = require("hardhat");
const addr                    = require("../addresses");

async function main() {
  let deployer                = await ethers.getSigner();
  let chainID                 = await deployer.getChainId();

  // We get the contract to deploy
  const ERC20                 = await ethers.getContractFactory("ERC20");
  const Factory               = await ethers.getContractFactory("Factory");

  let targetChainID           = addr.oppositeOf(chainID);

  let amount0                 = ethers.utils.parseEther("100");
  let amount1                 = ethers.utils.parseEther("100");

  let factoryAddr             = addr.addressOf(chainID, addr.alias.FACTORY);
  let token0                  = addr.addressOf(chainID, addr.alias.TEST_TOKEN);
  let token1                  = addr.addressOf(targetChainID, addr.alias.TEST_TOKEN);

  const erc20                 = await ERC20.attach(token0);
  const factory               = await Factory.attach(factoryAddr);

  // let factoryTargetChainID    = await factory.targetChainID();
  // console.log(`Chain ID ${chainID}.\nTarget chain ID ${targetChainID} = factory target chain ID ${factoryTargetChainID}`);

  console.log(`Approving token to be spend by Factory...`);
  let apprTx = await erc20.approve(factoryAddr, ethers.utils.parseEther("100000"));
  await apprTx.wait();
  console.log(`Approved!`);

  console.log(`create pair of ${chainID}:${token0}-${targetChainID}:${token1}`);

  console.log(`Initializing Pair creation...`);
  let initTx = await factory.initializeCreation([token0, token1], [amount0, amount1]);
  let res = await initTx.wait();
  console.log(`Pair creation initialized!`);

  console.log(res);
}
  
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
