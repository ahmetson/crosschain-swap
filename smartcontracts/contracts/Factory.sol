// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './interfaces/FactoryInterface.sol';
import './interfaces/FeeVaultInterface.sol';
import './interfaces/IERC20.sol';
import './Pair.sol';
import './Arachyl.sol';

contract Factory is FactoryInterface, Arachyl {
    address         public override feeTo;
    address payable public override feeToSetter;

    bytes4 private constant SELECTOR_FROM = bytes4(keccak256(bytes('transferFrom(address,uint)')));

    uint            public override targetChainID;

    struct CreateParams {
        address[2] tokens; // token 0, token 1
        uint[2] amounts; // amount 0, amount 1
        uint8 v; 
        bytes32 r; 
        bytes32 s;
    }

    mapping(address => uint) public depositNonceOf;

    // token on this blockchain => token on the target blockchain => pair
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    modifier validSig(CreateParams memory params) {
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(depositNonceOf[msg.sender], params.amounts, msg.sender, params.tokens[0], params.tokens[1]));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, params.v, params.r, params.s);
        require(this.verifiers(_recover),  "INVALID_SIG");
        _;
        depositNonceOf[msg.sender]++;
    }

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

        feeInit();

        emit ChanPairCreated(thisChainID, targetChainID);
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    // uncomment to return bytecode of contract with arguments
    // function getBytecode(address _owner, uint _foo) public pure returns (bytes memory) {
    function getBytecode() public pure returns (bytes memory) {
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
        // Creating the Pair contract
        bytes32 salt = keccak256(abi.encodePacked(tokens));

        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(getBytecode()))
        );

        // NOTE: cast last 20 bytes of hash to address
        return address(uint160(uint(hash)));
    }

    /** @notice Create a Token Pair, where one of the token is
     *  on this Blockchain. While another token is on another Blockchain.
     */
    function create(
        CreateParams memory params
    ) public validSig(params) payable returns (address) {
        // require(feeVault != address(0), "NO_FEE_VAULT");
        // require(msg.value >= feeUserPairCreation, "NOT_ENOUGH_PAIR_CREATION_FEE");
        // make sure that signature is not generated
        // require(amounts[0] > 0 && amounts[1] > 0 && tokens[0] != address(0) && tokens[1] != address(0), '0');
        // require(getPair[tokens[0]][tokens[1]] == address(0), 'PAIR_EXISTS');

        // feeVault.transfer(feeUserPairCreation);
        // if ((msg.value - feeUserPairCreation) > 0) {
            // payable(msg.sender).transfer(msg.value - feeUserPairCreation);
        // }

        // Creating the Pair contract
        Pair pairInstance = new Pair{salt: keccak256(abi.encodePacked(params.tokens))}();
        address pair = address(pairInstance);

        uint preBalance = IERC20(params.tokens[0]).balanceOf(pair);
        IERC20(params.tokens[0]).transferFrom(msg.sender, pair, params.amounts[0]);
        params.amounts[0] = IERC20(params.tokens[0]).balanceOf(pair) - preBalance;

        Pair(pair).create(params.tokens, [params.amounts[0], params.amounts[1]], msg.sender);

        // populate mapping in the reverse direction
        getPair[params.tokens[0]][params.tokens[1]] = pair;
        getPair[params.tokens[1]][params.tokens[0]] = pair;

        allPairs.push(pair);
        
        emit PairCreated(params.tokens[0], params.tokens[1], pair, allPairs.length);

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
