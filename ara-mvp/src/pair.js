let ethBsc = {
    sourceChainId: parseInt(process.env.ETH_CHAIN_ID),
    targetChainId: parseInt(process.env.BSC_CHAIN_ID)
}

if (isNaN(ethBsc.sourceChainId) || isNaN(ethBsc.targetChainId)) {
    throw `Missing ETH_CHAIN_ID or BSC_CHAIN_ID environment variable`;
}

let isPair = (sourceChainId, targetChainId) => {
    return ethBsc.sourceChainId == sourceChainId && ethBsc.targetChainId == targetChainId;
}

module.exports = {
    isPair: isPair
};