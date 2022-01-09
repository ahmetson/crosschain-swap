const APPROVE_STATE     = 1;
const REVOKE_STATE      = 2;

let pairCreated = async (arachyls, networkId, targetNetworkId, details, web3) => {
    // Parameters to insert
    let token0      = details.indexedParameters[0].value;
    let token1      = details.indexedParameters[1].value;
        
    let pair        = details.indexedParameters[2].value;

    console.log(`In Chain: ${networkId} with token ${token0} and token ${token1} created a pair: ${pair}`);

    //v, r, s related stuff
    let bytes32     = web3.eth.abi.encodeParameters(["uint256"], [APPROVE_STATE]);
    let hash        = web3.utils.keccak256(pair + bytes32.substr(2));

    let sigs        = [];

    for (var arachyl of arachyls) {
        let sig = await arachyl.sign(hash);

        sig.v = parseInt(sig.v, 16);
        console.log(sig);

        sigs.push(sig);
    }


    console.log(`Generated Signatures: `, sigs);
    console.log(`Now need to push it to the Blockchain to approve.`);
}

/**
 *  event Fees(uint256 feeZero, uint256 feeOne, uint256 feeTwo, uint256 feeThree);
 *  event TierEditer(address indexed user, bool allowed);
 *  event Claim(address indexed investor, uint8 indexed tier);
 *  event Use(address indexed investor, uint8 indexed tier);
 */
const pairCreation = async (arachyls, network, targetNetwork, details, web3) => {
  console.log(details.filterId);
  console.log(`${network.networkName}${targetNetwork.networkName}PairCreated`);

  switch (details.filterId) {
    case `${network.networkName}${targetNetwork.networkName}PairCreated`:
      await pairCreated(arachyls, network.networkId, targetNetwork.networkId, details, web3);
      break;
    default:
      return;
  }
}


module.exports = {
    pairCreation
}