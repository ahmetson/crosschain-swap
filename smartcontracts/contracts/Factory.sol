// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './interfaces/FactoryInterface.sol';
import './interfaces/IERC20.sol';
import './Pair.sol';
import './Arachyl.sol';

contract Factory is FactoryInterface, Arachyl {
    address         public override feeTo;
    address payable public override feeToSetter;

    uint            public override targetChainID;

    // token on this blockchain => token on the target blockchain => pair
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    /**
     *  @notice Factory is deployed per blockchain pair.
     *  @param _targetChainID     the paired blockchain to the blockchain where this Smartcontract was deployed.
     */
    constructor (
        address payable _feeToSetter, 
        uint            _targetChainID
    ) {
        require(feeToSetter == address(0) || feeToSetter == msg.sender, "FORBIDDEN");
        
        uint thisChainID = block.chainid;
        require(_targetChainID > 0 && _targetChainID != thisChainID, "Invalid target blockchain");

        feeToSetter     = _feeToSetter;
        targetChainID   = _targetChainID;

        emit ChanPairCreated(thisChainID, targetChainID);
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function getBytecode(address _owner, uint _foo) public pure returns (bytes memory) {
        bytes memory bytecode = type(Pair).creationCode;

        // uncomment to have it with constructor arguments
        // return abi.encodePacked(bytecode, abi.encode(_owner, _foo));
        return bytecode;
    }

    function getAddress(address[2] memory tokens) /// amount 0, amount 1
        public
        view
        returns (address)
    {
        uint thisChainID = block.chainid;

        // Creating the Pair contract
        bytes32 salt = keccak256(abi.encodePacked(thisChainID, targetChainID, tokens[0], tokens[1]));

        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(getBytecode(msg.sender, 0)))
        );

        // NOTE: cast last 20 bytes of hash to address
        return address(uint160(uint(hash)));
    }

    /** @notice Create a Token Pair, where one of the token is
     *  on this Blockchain. While another token is on another Blockchain.
     * 
     *  @param tokens - first token is the token on this blockchain.
     *  and second token is the token on the target blockchain.
     *  @param amounts - amount of tokens to put on this blockchain.
     *  and second element is the amount on the target blockchain.
     */
    function initializeCreation(
        address[2] calldata tokens, // token 0, token 1
        uint[2] calldata amounts // amount 0, amount 1
    ) external override returns (address) {
        uint thisChainID = block.chainid;
        require(amounts[0] > 0 && amounts[1] > 0, 'ZERO_AMOUNT');
        require(tokens[0] != address(0) && tokens[1] != address(0), 'ZERO_ADDRESS');

        require(getPair[tokens[0]][tokens[1]] == address(0), 'PAIR_EXISTS');

        // Creating the Pair contract
        bytes32 salt = keccak256(abi.encodePacked(thisChainID, targetChainID, tokens[0], tokens[1]));
        Pair pairInstance = new Pair{salt: salt}();
        address pair = address(pairInstance);

        require(IERC20(tokens[0]).transferFrom(msg.sender, pair, amounts[0]), "FAILED_TO_TRANSFER_TOKEN");

        Pair(pair).initializeCreation(tokens, amounts, msg.sender);

        // populate mapping in the reverse direction
        getPair[tokens[0]][tokens[1]] = pair;
        getPair[tokens[1]][tokens[0]] = pair;

        allPairs.push(pair);
        
        emit PairCreated(tokens[0], tokens[1], pair, allPairs.length);

        return pair;
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, 'FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address payable _feeToSetter) external override {
        require(msg.sender == feeToSetter, 'FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}
