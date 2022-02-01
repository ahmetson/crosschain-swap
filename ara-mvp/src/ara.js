/**
 * @description Ara node imitators.
 * Those who validate the transaction and sign it.
 */

/**
 * @description Returns web3.Wallets
 * @param {web3} Initialized Web3.js library
 * @param {Integer} amount 
 */
let get = async (web3) => {
    let privKey_1 = process.env.ARA_PRIV_KEY_1;
    let privKey_2 = process.env.ARA_PRIV_KEY_2;

    if (!privKey_1 || !privKey_2) {
        throw `ARA_PRIV_KEY_1 or ARA_PRIV_KEY_2 missing!`;
    }

    try {
        let acc_1 = web3.eth.accounts.privateKeyToAccount(privKey_1);
        let acc_2 = web3.eth.accounts.privateKeyToAccount(privKey_2);
        return [acc_1, acc_2];
    } catch (error) {
        throw error.toString();
    }
};

let signFee = async (factoryAddr, prevTimestamp, pairCreation, forArachyls, signer, web3) => {
    let bytes32     = web3.eth.abi.encodeParameters(["uint256", "uint256", "uint256"], [prevTimestamp, pairCreation, forArachyls]);
    let hash        = web3.utils.keccak256(factoryAddr + bytes32.substr(2));

    // address(this), feeTimestamp, _pairCreation, _forArachyls
    //v, r, s related stuff
    let sig = await arachyl.sign(hash);

    sig.v = parseInt(sig.v, 16);

    return sig;
}

let signCreation = async (nonce, user, amounts, tokens, signer) => {
    // depositNonceOf[msg.sender], params.amounts, msg.sender, params.tokens
    let bytes32 = utils.defaultAbiCoder.encode(["uint256", "uint256[2]"], [nonce, amounts]);
    let str = bytes32 + user.substr(2) + tokens[0].substr(2) + tokens[1].substr(2);
    let data = utils.keccak256(str);
    sig = await signer.signMessage(utils.arrayify(data));
    
    sig.v = parseInt(sig.v, 16);

    return sig;
}

module.exports = {
    get,
    signFee,
    signCreation
}