// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './UniswapV2ERC20.sol';
import './libraries/Math.sol';
import './libraries/UQ112x112.sol';
import './interfaces/IERC20.sol';
import './interfaces/PairInterface.sol';
import './interfaces/FactoryInterface.sol';
import './interfaces/ArachylInterface.sol';
import './interfaces/FeeVaultInterface.sol';
import './interfaces/IUniswapV2Callee.sol';
import './Arachyl.sol';

/**
 * @notice The first blockchain that keeps the token balance of the user.
 * It doesn't create a pair token.
 *
 * It has liquidity balance that is filled when user adds a liquidity.
 * User calls this contract first, when he wants to add a liquidity.
 * Or when user wants to swap token from this blockchain.
 *
 * When this contract is called first, user can cancel the called event by passing the signature from the Ara blockchain.
 *
 * User calls this contract last, when he wants to remove a liquidity.
 * Or when user wants to swap token from another blockchain to this one.
 *
 * When this contract is the last, user has to pass a signature from the Ara blockchain.
 */
contract TargetChain is Arachyl {
    
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint)')));
    bytes4 private constant SELECTOR_FROM = bytes4(keccak256(bytes('transferFrom(address,address,uint)')));

    address public thisToken;
    address public targetToken;

    //
    // Initiate liquidity addition
    //
    struct WithdrawParams {
        address token;
        uint amount;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    mapping(address => uint) public withdrawNonceOf;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    event Deposit(address indexed investor, address indexed token, uint amount);
    event Withdraw(address indexed investor, address indexed token, uint amount, uint withdrawCounter);

    modifier validSig(WithdrawParams memory params) { // token, uint amount, uint8 v, bytes32 r, bytes32 s) {
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(withdrawNonceOf[msg.sender], params.amount, msg.sender, params.token));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, params.v, params.r, params.s);
        require(this.verifiers(_recover),  "INVALID_SIG");
        _;
        withdrawNonceOf[msg.sender]++;
    }

    constructor() {
        verifiers[msg.sender] = true;
    }

    /**
     * @dev Called as a first step of the following processes:
     *
     * - Create Liquidity
     * - Add Liquidity
     * - Swap Token from blockchain where this contract is deployed to another blockchain.
     *
     * Then, user has to get the signature from the Ara blockchain and with that go to another blockchain.
     */
    function deposit(
        address token,
        uint amount
    ) external payable returns (uint) {
        // require(feeVault != address(0), "NO_FEE_VAULT");
        // require(msg.value >= feeUserPairCreation, "NOT_ENOUGH_PAIR_CREATION_FEE");
        require(amount > 0 && token != address(0), '0');

        // feeVault.transfer(feeUserPairCreation);
        // if ((msg.value - feeUserPairCreation) > 0) {
            // payable(msg.sender).transfer(msg.value - feeUserPairCreation);
        // }

        uint preBalance = IERC20(token).balanceOf(address(this));

        _safeTransferFrom(token, msg.sender, amount);

        uint postBalance = IERC20(token).balanceOf(address(this));

        amount = postBalance.sub(preBalance);

        emit Deposit(msg.sender, token, amount);

        return amount;
    }

    /**
     * @dev Called by the user as a last step of the following processes:
     *
     * - Remove Liquidity
     * - Swap Token from another blockchain to this blockchain where TargetChain contract was deployed
     *
     * User has to get the signature from the Ara blockchain
     */
    function withdraw(WithdrawParams memory params) validSig(params) external {
        // require(params.amount > 0 && params.token != address(0), '0');

        uint preBalance = IERC20(params.token).balanceOf(address(this));

        _safeTransfer(params.token, msg.sender, params.amount);

        uint postBalance = IERC20(params.token).balanceOf(address(this));

        params.amount = postBalance.sub(preBalance);

        emit Withdraw(msg.sender, params.token, params.amount, withdrawNonceOf[msg.sender]);
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FAILED');
    }

    function _safeTransferFrom(address token, address from, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_FROM, from, address(this), value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FROM_FAILED');
    }
}
