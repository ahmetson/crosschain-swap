const schedule          = require('node-schedule');

const blockchain        = require('./blockchain');
const ara               = require('./ara');
const ethers            = require('ethers');

// GAS LIMITs
// Please check the xdex/smartcontracts/Arachyl.sol
// For default gas Prices.
let USER_PAIR_CREATION  = "3419909448362304";
let FEE_UPDATE          = "215052909743664";

const job = schedule.scheduleJob('*/7 * * * *', async () => {
	let web3            = await blockchain.reInit(process.env.ETH_REMOTE_URL);
    let rinkebyChainId  = await web.eth.getChainId();

    // load arachyls
    let arachyls        = await ara.get(web3);

    // load factory
    let factoryInstance = await blockchain.factoryInstance(web3, rinkebyChainId);

    // get gas price in WEI
    let gasPrice        = await rinkebyWeb3.eth.getGasPrice();

    console.log('The answer to life, the universe, and everything!');
    let arachylAddresses = [arachyls[0].address, arachyls[1].address];

    // todo calculate gas price in web3 bignumber format or BN
    let pairCreationFee   = ethers.BigNumber.from(USER_PAIR_CREATION).mul(gasPrice);
    let forArachyls       = ethers.BigNumber.from(FEE_UPDATE).mul(gasPrice);

    let prevTimestamp = await factoryInstance.feeTimestamp(); prevTimestamp = parseInt(prevTimestamp);

    let sig_1 = await signFee(factoryInstance.address, prevTimestamp, pairCreationFee, forArachyls, arachyls[0], web3);
    let sig_2 = await signFee(factoryInstance.address, prevTimestamp, pairCreationFee, forArachyls, arachyls[1], web3);

    let v = [sig_1.v, sig_2.v];
    let r = [sig_1.r, sig_2.r];
    let s = [sig_1.s, sig_2.s];

    console.log(`Updating fees...`);
    let feeTx = await factory.feeUpdate(pairCreationFee, forArachyls, arachylAddresses, v, r, s);
    console.log(`Fee updated!`);
});

// todo run the cron jon automatically
(async () => {
    job();
})();