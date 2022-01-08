const addresses = {
    4:                  // rinkeby network
    {
        offset: 0,
        remoteHttp: process.env.REMOTE_HTTP,
        contracts: 
        {
            erc20: "0x513F7cbC3fFD22b60883208aC37A02ab69B64f87",    // test erc20 to work with
            factory: "0x922C9b89E115BAa5c9aF6F74419F73d1786263d0"
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
    }
}

const opposite = {
    4: 42,
    42: 4
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