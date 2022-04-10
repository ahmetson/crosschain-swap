let blockchain = require('../blockchain');
let ara = require('../ara');

// global variables for testing
let randomAccounts;
let accountsAmount = 15;
let routeLength = 5;
let uids = [];
let v = [];
let r = [];
let s = [];

let nearestUid = (uids, uidHex) => {
    let uid = parseInt(uidHex);

    if (uid > parseInt(uids[accountsAmount - 1], 16) || uid < parseInt(uids[0], 16)) {
        return uids[accountsAmount - 1];
    }

    for (var i = accountsAmount - 1; i >= 0; i--) {
        if (uid > parseInt(uids[i], 16)) {
            return uids[i];
        } else {
            continue;
        }
    }
}

let accountByUid = (uid) => {
    let i = uids.indexOf(uid);
    return randomAccounts[i];
}

let randomMessage = (web3) => {
    return lastFourBytes(web3.utils.keccak256("0x" + (parseInt(Math.random() * 9000) + 1000).toString(16)));
}

let lastFourBytes = (str) => {
    return "0x" + str.substr(str.length - 8, 8);
}

let signMessage = async (nonce, random, signer, web3) => {
    // nonce, random
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint32"], [nonce, random]);
    let str = bytes32;
    let data = web3.utils.keccak256(str);
    sig = await signer.sign(data);
    
    sig.v = parseInt(sig.v, 16);

    return sig;
}

console.log(`Testing the Ara with 10 accounts`);
console.log(`This script is intendended to create a route`);

console.log(`\n\nThe list of accounts:`);
// create 10 random accounts
(async() => {

    let rinkebyWeb3 = blockchain.reInit(process.env.ETH_REMOTE_URL);
    randomAccounts = ara.random(rinkebyWeb3, accountsAmount);

    for (let i in randomAccounts) {
        let id = ((parseInt(i) + 1) * 16).toString(16).padStart(2, "0");
        let uid = "0x" + id + id + id + id;

        uids.push(uid);
    }

    for (let i in randomAccounts) {
        console.log(`account hash: ${uids[i]}: ${randomAccounts[i].address}`);
    }
    
    // random uids
    for (var i = 0; i < 10; i++) {
        let random = randomMessage(rinkebyWeb3);
        console.log(`\tNearest UID of random message ${random}: ${nearestUid(uids, random)}`);
    }
    
    let random = randomMessage(rinkebyWeb3);
    let uid = nearestUid(uids, random);
    let account = accountByUid(uid);
    console.log(`0: Signer is ${account.address} of uid ${uid} for message ${random}`); 

    let sig = await signMessage(1, random, account, rinkebyWeb3);
    console.log(`Generated message: ${lastFourBytes(sig.message)}`);
    
    for (var i = 1; i < routeLength; i++) {
        random = lastFourBytes(sig.message);
        uid = nearestUid(uids, random);
        account = accountByUid(uid);
        console.log(`${i}: Signer is ${account.address} of uid ${uid} for message ${random}`); 
        sig = await signMessage(1, random, account, rinkebyWeb3);
        console.log(`Generated message: ${lastFourBytes(sig.message)}`);
    }
})();
