/**
 * Create an imitation of the distributed system including Arachyls and s1, s2.
 * This system exposes API to imitate transactions by Arachyls, s1 or s2.
 * 
 * The system creates 15 accounts.
 * The 7 of 15 is adversary.
 * 
 * The adversaries can do two attacks:
 * 1. create a message that is not from the s1.
 * 2. change the message parameters from s1 to manipulate the data.
 * 
 * The first attack type means that manipulaters are trying to steal token directly on s2.
 * The second attack type means that user and the adversary accounts are on the same side.
 * 
 * How do we prevent the second attack type?
 * How do we prevent the first attack type?
 * 
 * In order to solve the first type of attack, we add a second layer of verification.
 * The message inclusion into s2 takes the money from the rest of the UIDs, except the five nodes on the route.
 * The money is used as a locked collateral.
 * 
 * Then, based on the hash of collateral lock, we generate a node hash.
 * Node hash is used to unlock the collateral. The hash is divided by 5.
 * And atleast 2 of 5 nodes should create a route to generate a hash.
 * This one doesn't use any nonce. The route nodes are picked from 5 options that blockchain gives.
 * 
 * If the new node is added to the blockchain, then the user can reclaim the tokens.
 */
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

const ROUTE_DIFFICULTY = 1;

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

let isDifficult = (hex, difficulty) => {
    let str = "0x";
    for (var j = 0; j < difficulty; j++) {
        str += "00";
    }

    if (hex.indexOf(str) !== 0) {
        return false;
    }

    return true;
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
    // assume that difficulty is checked by the user before he adds the account to the blockchain.
    // for now here we skip it.
    for (var i = 0; i < 10; i++) {
        let random = randomMessage(rinkebyWeb3);
        console.log(`\tNearest UID of random message ${random}: ${nearestUid(uids, random)}`);
    }
    
    /////////////////////////////////
    //
    // Picking the random data to select route 0
    //
    // We also not checking the difficulty of the first message. since user will do it on his side.
    /////////////////////////////////
    let random = randomMessage(rinkebyWeb3);
    let uid = nearestUid(uids, random);

    console.log(`---------------------------------------`)
    console.log(`ROUTE START: SELECT THE MESSAGE`);
    console.log(`---------------------------------------`)
    
    let beforeFirstDiscover = new Date();
    console.log(`Before discover of the first message to assign to the first hacker: ${beforeFirstDiscover}`)
    while(true) {
        if (uids.indexOf(uid) == 0) {
            break;
        }
        random = randomMessage(rinkebyWeb3);
        uid = nearestUid(uids, random);
    }
    console.log(`After discover of the first message to assign to the first hacker: ${new Date()}`);
    let account = accountByUid(uid);
    console.log(`0: Starting with UID ${uid} Address(${account.address}), message ${random}`); 

    //////////////////////////////////
    //
    // Picking the random data to select route 1
    //
    //////////////////////////////////
    console.log(`---------------------------------------`)
    console.log(`ROUTE 1/5: SIGN MESSAGE`);
    console.log(`---------------------------------------`)

    let sig;
    let nonce = 1;

    console.log(`Before discover of the second message to assign to the first hacker: ${new Date()}`)

    while (true) {
        sig = await signMessage(nonce++, random, account, rinkebyWeb3);
        if (!isDifficult(sig.message, ROUTE_DIFFICULTY)) {
            // console.log(`${nonce}: ${sig.message}`)
            continue;
        }
        random = lastFourBytes(sig.message);
        uid = nearestUid(uids, random);
        if (uids.indexOf(uid) == 1) {
            console.log(`Message nonce: ${nonce}: ${random} from message ${sig.message}, next uid is ${uid}`);
            break;
        }
    }
    console.log(`After discover of the second message to assign to the first hacker: ${new Date()}`)

    for (var i = 1; i < routeLength; i++) {
        console.log(`---------------------------------------`)
        console.log(`ROUTE ${i + 1}/5: SIGN MESSAGE`);
        console.log(`---------------------------------------`)
    
        account = accountByUid(uid);
        nonce = 1;
        console.log(`Before discover of the ${i+1}/5 message to assign to the first hacker: ${new Date()}`)

        while (true) {
            sig = await signMessage(nonce++, random, account, rinkebyWeb3);
            if (!isDifficult(sig.message, ROUTE_DIFFICULTY)) {
                // console.log(`${nonce}: ${sig.message}`)
                continue;
            }
            random = lastFourBytes(sig.message);
            uid = nearestUid(uids, random);
            if (uids.indexOf(uid) == i+1) {
                console.log(`Message nonce: ${nonce}: ${random} from message ${sig.message}, next uid is ${uid}`);
                break;
            }
        }
        console.log(`After discover of the ${i+1}/5 message to assign to the first hacker: ${new Date()}`)
        console.log(`${i}: Signer is ${account.address} of uid ${uid} for message ${random}`); 
        sig = await signMessage(1, random, account, rinkebyWeb3);
        console.log(`Generated message: ${lastFourBytes(sig.message)}`);
    }
})();
