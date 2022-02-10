/**
 * This is the primary script containing the configuration only
 * 
 * Depends on:
 * 
 * - web3
 * - evmChains
 */
 
let FIXED_DIGITS = 6;

// As for now we test the game on 
let blockchainConfig = {
    "4": {        
        "name": "Eth Rinkeby",                          // Chain ID, 1 for Ethereum Mainnet. 4 for Rinkeby Testnet.
        "source": true,
        "pairedTo": "97",
        "tokens": [
            {
                name: "ET-1",
                address: "0x07ae2850929e0345ed29b7C07c7C52dF9a10bC05"
            },
            {
                name: "ET-2",
                address: "0x8d223537af5E21F4Be1C995C484fcE36da582250"
            }
        ],
        "contract": {
            address: "0xE60E564454286aDfb3Ff02991a07AC5F17B09C80",
            abi: "factory"
        },
        tokenAbi: "erc20",
        pairAbi: "pairAbi"
    },
    "97": {
        "name": "BSC Testnet",
        "source": false,
        "pairedTo": "4",
        "tokens": [
            {
                name: "BT-1",
                address: "0xF4462f7E5659A0f60d5F5cd876b4ea64f5C394B2"
            },
            {
                name: "BT-2",
                address: "0xb8b3D703919Ff7f85c612Bd53Fd4A678553f3E50"
            }
        ],
        "contract": {
            address: "0x769A67b94dF2D56135A6E9fC10C4d057059DE2C6",
            abi: "targetChain"
        },
        tokenAbi: "erc20"
    }
};

let getSourceConf = function() {
    for (var id of Object.keys(blockchainConfig)) {
        if (blockchainConfig[id].source) {
            return blockchainConfig[id];
        }
    }
}

let getTargetConf = function() {
    for (var id of Object.keys(blockchainConfig)) {
        if (!blockchainConfig[id].source) {
            return blockchainConfig[id];
        }
    }
}

let isSource = function(chainId) {
    if (!blockchainConfig[chainId]) {
        return false;
    }

    return blockchainConfig[chainId].source;
}

/**
 * Returns a contract instance to use. If the configuration doesn't support the connected wallet, then throws an error.
 * @param {string} name of contract to load from blockchainConfig.
 * @throws Exception in case of unconnected wallet, invalid network, damage of configuration
 */
let loadContracts = async function() {
    if (!web3) {
        throw "Failed to load Web3 library. Please check your internet connection!";
    }
    if (web3.eth === undefined) {
        throw "Provider not instantiniated. Please connect the wallet";
    }

    let data = isSource(chainId) ? getSourceConf() : getTargetConf();

    let address = data.contract.address;
    let abiName = data.contract.abi;
    let abi = window[abiName];
    window.xdex = new web3.eth.Contract(abi, address);

    let tokenAbi = window[data.tokenAbi];

    window.tokens = {};
    for (var token of data.tokens) {
        window.tokens[token.address] = new web3.eth.Contract(tokenAbi, token.address);
    }
}

let loadPair = function(pairAddress) {
    if (!web3) {
        throw "Failed to load Web3 library. Please check your internet connection!";
    }
    if (web3.eth === undefined) {
        throw "Provider not instantiniated. Please connect the wallet";
    }

    let data = getSourceConf();

    let abiName = data.pairAbi;
    let abi = window[abiName];

    window.pair = new web3.eth.Contract(abi, pairAddress);
}

let araUrl = 'http://localhost:3000/'

let fetchSig = async function(type, params) {
    const rawResponse = await fetch(`${araUrl}${type}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    return await rawResponse.json();
};
