pragma solidity =0.5.16;

import './interfaces/FactoryInterface.sol';
import './interfaces/IERC20.sol';
import './Pair.sol';
import './Arachyl.sol';

contract Factory is FactoryInterface, Arachyl {
    address         public feeTo;
    address payable public feeToSetter;

    address         public verifierManager;
    uint            public targetChainID;

    // token on this blockchain => token on the target blockchain => pair
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event ChanPairCreated(uint indexed firstChainID, uint indexed targetChainID);
    event PairCreated(address indexed token0, address indexed token1, address pair, uint pairNumber);

    /**
     *  @notice Factory is deployed per blockchain pair.
     *  @param _targetChainID     the paired blockchain to the blockchain where this Smartcontract was deployed.
     */
    constructor(
        address payable _feeToSetter, 
        address         _verifierManager, 
        uint            _targetChainID
    ) public {
        require(feeToSetter == address(0) || feeToSetter == msg.sender, "FORBIDDEN");
        
        uint thisChainID = getChainID();
        require(_targetChainID > 0 && _targetChainID != thisChainID, "Invalid target blockchain");

        feeToSetter     = _feeToSetter;
        verifierManager = _verifierManager;
        targetChainID   = _targetChainID;

        emit ChanPairCreated(thisChainID, targetChainID);
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
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
    ) external returns (address pair) {
        uint thisChainID = getChainID();
        require(amounts[0] > 0 && amounts[1] > 0, 'ZERO_AMOUNT');
        require(tokens[0] != address(0) && tokens[1] != address(0), 'ZERO_ADDRESS');

        require(getPair[tokens[0]][tokens[1]] == address(0), 'PAIR_EXISTS');

        // Creating the Pair contract
        bytes memory bytecode = type(Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(thisChainID, targetChainID, tokens[0], tokens[1]));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        require(IERC20(tokens[0]).transferFrom(msg.sender, pair, amounts[0]), "FAILED_TO_TRANSFER_TOKEN");

        Pair(pair).initializeCreation(tokens, amounts, msg.sender);

        // populate mapping in the reverse direction
        getPair[tokens[0]][tokens[1]] = pair;
        getPair[tokens[1]][tokens[0]] = pair;

        allPairs.push(pair);
        
        emit PairCreated(tokens[0], tokens[1], pair, allPairs.length);

        return pair;
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address payable _feeToSetter) external {
        require(msg.sender == feeToSetter, 'FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    function getChainID() public view returns (uint) {
        uint id;
        assembly { id := chainid() }
        return id;
    }
}
