const addresses = {
    4:                  // rinkeby network
    {
        offset: 0,
        remoteHttp: process.env.REMOTE_HTTP,
        contracts: 
        {
            erc20: "0xf75f75F4bc65CE68959d887F850b90f4B08b4a4b",    // test erc20 to work with
            factory: "0x71E8B0632F2750f616B5C1773d7aA93c89e88bc5"
        }
    },
    42:                 // kovan network
    {
        offset: 300,
        remoteHttp: process.env.KOVAN_REMOTE_HTTP,
        contracts: 
        {
            erc20: "0xa7a98F2BCa3dFe72010841cE6B12Ce4810D0f8F4",
            factory: "0x0544B81512DF70e8Aeb213FE644269fD621dEEB4"
        }
    },
    97:                  // bsc testnet network
    {
        offset: 0,
        remoteHttp: process.env.BSC_TESTNET_REMOTE_HTTP,
        contracts: 
        {
            erc20: "0x2b1b37F2CC4f81d2D9555B97B9ed3520ab01EF98",    // test erc20 to work with
            factory: "0x9650784847c61b6da1E0aA51A9a9Fe7914Bc60b2"
        }
    },
}

const opposite = {
    4: 97,
    97: 4
}

let alias = {
    TEST_TOKEN: "erc20",
    FACTORY: "factory"
}

let addressOf = function(chainID, name) {
    if (addresses[chainID] === undefined) {
        throw `Unsupported chain id ${chainID}`;
    }

    if (!addresses[chainID].contracts[name]) {
        throw `Address not set or alias name ${name} is invalid`;
    }

    return addresses[chainID].contracts[name];
}

let oppositeOf = function(chainID) {
    if (!opposite[chainID]) {
        throw `No supported chain id ${chainID}`;
    }

    return opposite[chainID];
}

let offsetOf = function(chainID) {
    if (!addresses[chainID]) {
        throw `No supported chain id ${chainID}`;
    }

    if (addresses[chainID].offset !== 0 && !addresses[chainID].offset) {
        throw `Invalid offset for chain id ${chainID}`;
    }

    return addresses[chainID].offset;
}

let remoteOf = function(chainID) {
    if (!addresses[chainID]) {
        throw `No supported chain id ${chainID}`;
    }

    if (!addresses[chainID].remoteHttp) {
        throw `Invalid remote http for chain id ${chainID}`;
    }

    return addresses[chainID].remoteHttp;
}

module.exports = {
    alias: alias,
    addressOf: addressOf,
    oppositeOf: oppositeOf,
    offsetOf: offsetOf,
    remoteOf: remoteOf
}