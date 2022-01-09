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

module.exports = {
    get
}