/**
 * @description Adds arachyls to Factory
 */
let blockchain  = require('../blockchain');
let ara         = require('../ara');

(async () => {
    let rinkebyWeb3 = blockchain.reInit(process.env.REMOTE_HTTP);
    // let bscWeb3     = blockchain.reInit(process.env.BSC_TESTNET_REMOTE_HTTP);

    let arachyls    = await ara.get(rinkebyWeb3);

    for (var arachyl of arachyls) {
        rinkebyWeb3.eth.accounts.wallet.add(arachyl);
    }

    let rinkebyChainId = await rinkebyWeb3.eth.getChainId();

    let rinkebyFactoryInstance = await blockchain.factoryInstance(rinkebyWeb3, rinkebyChainId);

    let rinkebyPrice = await rinkebyWeb3.eth.getGasPrice();
    for (var arachyl of arachyls) {
        let registered = await rinkebyFactoryInstance.methods.verifiers(arachyl.address).call();
        if (registered) {
            console.log(`Arachyl ${arachyl.address} already registered in Factory on chain id ${rinkebyChainId}`);
            continue;
        }

        console.log(`Register ${arachyl.address} in Factory of chain ${rinkebyChainId}...`);
        let rinkebyGas = await rinkebyFactoryInstance.methods.verifierRegistration().estimateGas({from: arachyl.address});
        let rinkebyTx = await rinkebyFactoryInstance.methods.verifierRegistration().send({from: arachyl.address, gas: rinkebyGas, gasPrice: rinkebyPrice});
    
        console.log(`${arachyl.address} registered!`, rinkebyTx.transactionHash);
    }

    console.log(`All arachyls are registered!`);

    process.exit(0);
})();
