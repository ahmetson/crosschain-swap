// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

/**
 *  Optimized description of Arachyl network.
register(01.02.03.04)
register(01.03.03.04)
register(01.02.04.05)
register(01.02.02.02)
register(01.02.02.03)
register(01.02.02.01)

root.min = 01
root.max = 01
root.minUid = 01.02.03.04
root.maxUid = 01.02.03.04  TODO need to update to 01.03.03.04

l0[01].min = 02
l0[01].max = 03
l0[01].minUid = 01.02.03.04     TODO need to update to 01.02.02.02
l0[01].maxUid = 01.03.03.04

l1[01.02].min = 02
l1[01.02].max = 04
l1[01.02].minUid = 01.02.02.02
l1[01.02].maxUid = 01.02.04.05

l1[01.03].min = 03
l1[01.03].max = 03
l1[01.03].minUid = 01.03.03.04
l1[01.03].maxUid = 01.03.03.04

l2[01.02.02].min = 02
l2[01.02.02].minUid = 01.02.02.02
l2[01.02.02].max = 03
l2[01.02.02].maxUid = 01.02.02.03
 */
contract Arachyl2 {
    // change the cws
    address cws = 0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a;

    uint constant registrationFee           = 20 * 1e18;
    uint8 constant registrationDifficulty   = 2;
    uint8 constant FIRST_ROUTE_DIFFICULTY   = 2;
    uint8 constant ROUTE_DIFFICULTY         = 4;
    uint32 constant ONE_CHILD               = 1;                //# macro line
    bool constant ACTIVATE                  = true;             //# macro line

    // OP stands for Operation
    struct OP {
        uint nonce;
        uint fee;
        bool activated;
    }

    struct NODE {
        bytes32 hash;
        uint nonce;
        uint16 port;
        bytes4 ip;
        address owner;
        bool activated;
    }

    struct LAYER {
        uint32 childrenAmount;          // Branches under this leaf
        bytes1 min;                     // The left child
        bytes1 max;                     // The right child
        bytes4 minUid;                  // The UID in the left child
        bytes4 maxUid;                  // The UID in the right child
        bool activated;                     
    }

    mapping(address => bool) public nodeOwners;
    // node uid = 0x01 e5 c3 83
    mapping(bytes4 => NODE) public nodes;

    mapping(uint16 => OP) public ops;

    LAYER public root;                // children: 1, min: 01, max: 01
    mapping (bytes1 => LAYER) public layer0;   // 01 => children 1, min: e5, min: e5
    mapping (bytes2 => LAYER) public layer1;   // 01 => children 1, min: e5, min: e5
    mapping (bytes3 => LAYER) public layer2;   // 01 => children 1, min: e5, min: e5

    constructor() {
        root.activated = true;
        // adding a test op
        ops[1] = OP(0, 10 * 1e18, ACTIVATE);

        // todo add the registration op
    }

    // satisfactory hash difficulty
    function isDifficult(
        bytes32 _arg, 
        uint8 _difficulty
    ) public pure returns (bool) {
        for (uint8 i = 0; i < _difficulty; i++) {
            if (_arg[i] != 0x00) {
                return false;
            }
        }

        return true;
    }

    // Return L0 key and its Child Layer ID from UID
    // For example if UID is 01.02.03.04
    // The L0 key would be 01, child would be 02
    function keyChildL0(bytes4 id) public pure returns(bytes1, bytes1) {
        return (bytes1(id), bytes1(id << 8));
    }

    // Return L1 key and its Child Layer ID from UID
    // For example if UID is 01.02.03.04
    // The L1 key would be 02, child would be 03
    function keyChildL1(bytes4 id) public pure returns(bytes2, bytes1) {
        return (bytes2(id), bytes1(id << 16));
    }

    // Return L2 key and its Child Layer ID from UID
    // For example if UID is 01.02.03.04
    // The L2 key would be 03, child would be 04
    function keyChildL2(bytes4 id) public pure returns(bytes3, bytes1) {
        return (bytes3(id), bytes1(id << 24));
    }

    function keyL1(bytes1 key0, bytes1 child) public pure returns(bytes2) {
        return bytes2(uint16(bytes2(key0)) + uint16(bytes2(child) >> 8));
    }

    function keyL2(bytes2 key1, bytes1 child) public pure returns(bytes3) {
        return bytes3(uint24(bytes3(key1)) + uint24(bytes3(child) >> 16));
    }

    function keyL3(bytes3 key2, bytes1 child) public pure returns(bytes4) {
        return bytes4(uint32(bytes4(key2)) + uint32(bytes4(child) >> 24));
    }

    function isCreatedL0(bytes1 id) public view returns(bool) {
        return layer0[id].activated;
    }

    function isCreatedL1(bytes2 id) public view returns(bool) {
        return layer1[id].activated;
    }

    function isCreatedL2(bytes3 id) public view returns(bool) {
        return layer2[id].activated;
    }

    // Create the L0, in the ring tree. And update the Root of the L0.
    function createL0(bytes4 id) internal {
        (bytes1 key0, bytes1 child) = keyChildL0(id);

        layer0[key0] = LAYER(ONE_CHILD, child, child, id, id, ACTIVATE);

        // Creating L0 means, creating L1 and so on.
        createL1(id);
    }

    // Create the L1, in the ring tree.
    // The L1 is created after creation of the L2.
    function createL1(bytes4 id) internal {
        (bytes2 key1, bytes1 child) = keyChildL1(id); 

        layer1[key1] = LAYER(ONE_CHILD, child, child, id, id, ACTIVATE);

        // Creating L1 means also creating L2
        createL2(id);
    }

    // Create the L2, in the ring tree
    function createL2(bytes4 id) internal {
        (bytes3 key2, bytes1 child) = keyChildL2(id); 

        layer2[key2] = LAYER(ONE_CHILD, child, child, id, id, ACTIVATE);
    }

    // We update the Ring Tree from root to branches.
    function updateRoot(bytes4 id) internal {
        bytes1 key0 = bytes1(id);

        // might be the first node thats ever added
        // might be that ring already has a node.

        if (root.min == 0 || key0 < root.min) {
            root.min            = key0;
        }
        if (root.max == 0 || id > root.max) {
            root.max            = key0;
        }

        if (root.minUid == 0 || id < root.minUid) {
            root.minUid         = id;
        }
        if (root.maxUid == 0 || id > root.maxUid) {
            root.maxUid         = id;
        }

        if (isCreatedL0(key0)) {
            updateL0(id);
        } else {
            root.childrenAmount++;
            createL0(id);
        }
    }

    // update the layer 0
    function updateL0(bytes4 id) internal {
        (bytes1 key0, bytes1 child) = keyChildL0(id);

        if (layer0[key0].min == 0 || child < layer0[key0].min) {
            layer0[key0].min = child;
        }
        if (layer0[key0].max == 0 || child > layer0[key0].max) {
            layer0[key0].max = child;
        }

        if (layer0[key0].minUid == 0 || id < layer0[key0].minUid) {
            layer0[key0].minUid = id;
        }
        if (layer0[key0].maxUid == 0 || id > layer0[key0].maxUid) {
            layer0[key0].maxUid = id;
        }

        if (isCreatedL1(bytes2(id))) {
            updateL1(id);
        } else {
            layer0[key0].childrenAmount++;
            createL1(id);
        }

    }

    // update the layer 1
    function updateL1(bytes4 id) internal {
        (bytes2 key1, bytes1 child) = keyChildL1(id);

        if (layer1[key1].min == 0 || child < layer1[key1].min) {
            layer1[key1].min        = child;
        }
        if (layer1[key1].max == 0 || child > layer1[key1].max) {
            layer1[key1].max        = child;
        }

        if (layer1[key1].minUid == 0 || id < layer1[key1].minUid) {
            layer1[key1].minUid     = id;
        }
        if (layer1[key1].maxUid == 0 || id > layer1[key1].maxUid) {
            layer1[key1].maxUid     = id;
        }
        if (isCreatedL2(bytes3(id))) {
            updateL2(id);
        } else {
            layer1[key1].childrenAmount++;
            createL2(id);
        }
    }

    // update the layer 2
    function updateL2(bytes4 id) internal {
        (bytes3 key2, bytes1 child) = keyChildL2(id);

        if (layer2[key2].min == 0 || child < layer2[key2].min) {
            layer2[key2].min        = child;
        }
        if (layer2[key2].max == 0 || child > layer2[key2].max) {
            layer2[key2].max        = child;
        }

        if (layer2[key2].minUid == 0 || id < layer2[key2].minUid) {
            layer2[key2].minUid     = id;
        } 
        if (layer2[key2].maxUid == 0 || id > layer2[key2].maxUid) {
            layer2[key2].maxUid     = id;
        }

        layer2[key2].childrenAmount++;
    }

    // UID from hash
    function getLastFour(bytes32 _arg) public pure returns (bytes4) {
        bytes32 lastFour = _arg << 224;
        bytes4 encoded = bytes4(lastFour);

        for (uint8 i = 0; i < 4; i++) {
            require(encoded[i] != 0x00, "invalid_4_bytes");
        }

        return encoded;
    }

    function registrationHash(address owner, bytes4 ip, uint nonce) public pure returns(bytes32) {
        bytes32 hash = keccak256(abi.encodePacked(owner, ip, nonce));

        return hash;
    }

    function getNearestL0(bytes1 min, bytes1 key0) public view returns(bytes4) {
        for (uint8 i = uint8(key0) - 1; i > uint8(min); i--) {
            if (isCreatedL0(bytes1(i))) {
                return layer0[bytes1(i)].maxUid;
            }
        }

        return layer0[min].maxUid;
    }

    function getNearestL1(bytes2 min, bytes2 key1) public view returns(bytes4) {
        for (uint16 i = uint16(key1) - 1; i > uint16(min); i--) {
            if (isCreatedL1(bytes2(i))) {
                return layer1[bytes2(i)].maxUid;
            }
        }

        return layer1[min].maxUid;
    }

    function getNearestL2(bytes3 min, bytes3 key2) public view returns(bytes4) {
        for (uint24 i = uint24(key2) - 1; i > uint24(min); i--) {
            if (isCreatedL2(bytes3(i))) {
                return layer2[bytes3(i)].maxUid;
            }
        }

        return layer2[min].maxUid;
    }

    function getNearestL3(bytes4 min, bytes4 key3) public view returns(bytes4) {
        for (uint32 i = uint32(key3) - 1; i > uint32(min); i--) {
            if (nodes[bytes4(i)].activated) {
                return bytes4(i);
            }
        }

        return min;
    }

    // todo:
    // implement getRootMaxUid()
    function getNearestUid(bytes4 uid) public view returns(bytes4) {
        // if nodes exists, then simply return the node
        if (nodes[uid].activated) {
            return uid;
        }

        // uid < root.minUid, return getRootMaxUid()
        // uid > root.maxUid, return getRootMaxUid()
        if (uid < root.minUid || uid > root.maxUid) {
            return root.maxUid;
        }

        bytes1 key0 = bytes1(uid);
        if (!isCreatedL0(key0)) {
            return getNearestL0(root.min, key0);
        }
        if (uid < layer0[key0].minUid) {
            return getNearestL0(root.min, key0);
        }
        if (uid > layer0[key0].maxUid) {
            return layer0[key0].maxUid;
        }

        bytes2 key1 = bytes2(uid);
        if (!isCreatedL1(key1)) {
            return getNearestL1(keyL1(key0, layer0[key0].min), key1);
        }
        if (uid < layer1[key1].minUid) {
            return getNearestL1(keyL1(key0, layer0[key0].min), key1);
        }
        if (uid > layer1[key1].maxUid) {
            return layer1[key1].maxUid;
        }

        bytes3 key2 = bytes3(uid);
        if (!isCreatedL2(key2)) {
            return getNearestL2(keyL2(key1, layer1[key1].min), key2);
        }
        if (uid < layer2[key2].minUid) {
            return getNearestL2(keyL2(key1, layer1[key1].min), key2);
        }
        if (uid > layer2[key2].maxUid) {
            return layer2[key2].maxUid;
        }

        return getNearestL3(keyL3(key2, layer2[key2].min), uid);
        // get key0 from uid
        // if L0[key0] not exists, 
        //      getNearestL0(root.min, key0)
        //  root.min ... key0 found. then 
        //      return max.

        // if L0[key0] found
        // uid < L0[key0].minUid, 
        //      return getNearestL0(root.min, key0)
        // uid > L0[key0].maxUid, 
        //      return L0[key0].maxUid
        // L0[key0].minUid < uid < L0[key0].maxUid

        // get key1 from uid
        // if L1[key1] not exists
        //      getNearestL1(concat key0 + L0[key0].min, key1)
        // if L1[key1] found
        // uid < L1[key1].minUid
        //      getNearestL1(concat key0 + L1[key0].min, key1)
        // uid > L1[key1].maxUid
        //      return L1[key1].maxUid
        // L1[key1].minUid < uid < L1[key1].maxUid

        // get key2 from uid
        // if L2[key2] not exists
        //      getNearestL2(concat key1 + L1[key1].min, key2)
        // if L2[key2] found
        // uid < L2[key2].minUid
        //      getNearestL2(concat key1 + L1[key1].min, key2)
        // uid > L2[key2].maxUid
        //      return L2[key2].maxUid
        // L2[key2].minUid < uid < L2[key2].maxUid
        //      getNearestL3(concat key2 + L2[key2].min, uid)
    }

    // bytes1 + bytes1 + bytes1 + bytes1 => uid
    function getKey1(bytes1 key0, bytes1 min0, bytes1 min1, bytes1 min2) public pure returns(bytes4) {
        bytes4 id = bytes4(key0);
        bytes4 min = bytes4(min0) >> 8;
        id = id | min;
        id = id | (bytes4(min1) >> 16);
        id = id | (bytes4(min2) >> 24);
        return id;
    }

    // bytes2 + bytes1 + bytes1 => uid
    function getKey2(bytes2 key1, bytes1 min1, bytes1 min2) public pure returns(bytes4) {
        bytes4 key1Bytes = bytes4(key1);
        bytes4 min1Bytes = bytes4(min1) >> 16;
        key1Bytes = key1Bytes | min1Bytes;
        min1Bytes = bytes4(min2) >> 24;
        return key1Bytes | min1Bytes;
    }

    // bytes3 + bytes1 => uid
    function getUid(bytes3 key2, bytes1 min) public pure returns(bytes4) {
        bytes4 key2Bytes = bytes4(key2);
        bytes4 minBytes = bytes4(min) >> 24;
        return key2Bytes | minBytes;
    }

    /// One arachyl on S1.
    /// On macroes it would be as:
    //# if $deployment.networkName != "localhost" then uncomment end.
    /*function register(bytes4 ip, uint16 port, uint nonce) external {
        require(!nodeOwners[msg.sender], "0");
        // require(IERC20(cws).transferFrom(msg.sender, address(this), registrationFee), "1");

        bytes32 hash = registrationHash(msg.sender, ip, nonce);
        require(isDifficult(hash, registrationDifficulty), "no_difficult");

        bytes4 uid = getLastFour(hash);
        require(!nodes[uid].activated, "duplicated_uid");

        // iz layer 0 exists?
        if (!isCreatedL2(uid)) {
            createL2(uid);
        } else {
            updateL2(uid);
        }

        nodes[uid] = NODE(hash, nonce, port, ip, msg.sender, ACTIVATE);
    }*/

    // Set the UID in the ring tree.
    // UID is a 4 bytes long integer.
    // The first layer of ring tree is the first byte of the UID.
    // The second layer of ring tree is the second byte of the UID.
    // The third layer of ring tree is the third byte of the UID.
    // The Ring Tree layers are counted from 0. Therefore, the first layer means layer 0.
    //
    // Note that, update of the Ring tree goes from bottom to up.

    function testRegister(bytes4 uid) external {
        require(!nodes[uid].activated, "duplicated_uid");

        updateRoot(uid);

        nodes[uid].activated = ACTIVATE;
    }

    function message(uint16 opId, uint nonce, bytes32 data, address previous) public view returns(bytes32) {
        // this contract, opId, op.nonce, data, nonce, previous
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(address(this), opId, ops[opId].nonce, data, nonce, previous));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
    }

    function route(uint16 opId, bytes32 data, uint[5] calldata nonces, 
        uint8[5] calldata v, bytes32[5] calldata r, bytes32[5] calldata s) external {
        require(ops[opId].activated, "invalid_op");
        require(data != 0, "0");

        bytes4[5] memory uids;

        bytes32 _message = message(opId, nonces[0], data, address(0));
        // todo verify difficulty of _message for FIRST_ROUTE_DIFFICULTY
        uids[0] = getLastFour(_message); 
        require(nodes[uids[0]].owner == ecrecover(_message, v[0], r[0], s[0]), "0_failed");

        for (uint8 i = 1; i < 5; i++) {
            _message = message(opId, nonces[i], data, nodes[uids[i-1]].owner);
            // todo verify difficulty of _message for ROUTE_DIFFICULTY
            uids[i] = getLastFour(_message); 
            for (uint8 j = i - 1; j < i; j++) {
                require(uids[i] != uids[j], "duplicate");
            }
            require(nodes[uids[i]].owner == ecrecover(_message, v[i], r[i], s[i]), "failed");
        }

        require(nodes[uids[4]].owner == msg.sender, "not_owner");

        ops[opId].nonce++;
    }
}