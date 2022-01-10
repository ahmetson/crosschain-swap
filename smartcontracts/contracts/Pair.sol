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

contract Pair is UniswapV2ERC20, PairInterface {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public override constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint)')));

    address public override factory;
    address public override thisToken;
    address public override targetToken;

    bool    public override pendingCreation;
    address public override creator;
    uint[2] public override lockedAmounts;               // Initial lockedAmounts tokens. till approvement

    mapping(address => bool) creationVerifiers;     // verified

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint public override price0CumulativeLast;
    uint public override price1CumulativeLast;
    uint public override kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'UniswapV2: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2: TRANSFER_FAILED');
    }

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);
    event Created();
    event Destroyed();

    constructor() {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment
    // Initialize in the pendingCreation mode that Pair Creation announced.
    // The verifier picks the data, after matching with another part, verifier approves it.
    function initializeCreation(
        address[2] calldata _tokens,
        uint[2] calldata _amounts,
        address _creator
    ) external override {
        require(msg.sender == factory, 'FORBIDDEN'); // sufficient check

        pendingCreation         = true;
        thisToken       = _tokens[0];
        targetToken     = _tokens[1];
        lockedAmounts   = _amounts;
        creator         = _creator;
    }

    function approveCreation(address[] calldata arachyls, uint8[] calldata v, bytes32[] calldata r, bytes32[] calldata s) external override {
        require(pendingCreation, "already confirmed");

        ArachylInterface arachyl = ArachylInterface(factory);

        uint8 b = arachyl.b();
        require(
            arachyls.length == b &&
            v.length == b && 
            r.length == b && 
            s.length == b, "NOT_THRESHOLD"
        );

        uint state = 1;

        for (uint8 i = 0; i < b; i++) {
            require(arachyls[i] != address(0), "ZERO_ADDRESS");            
            require(!creationVerifiers[arachyls[i]], "DUPLICATE_ARACHYL");
            require(arachyl.verifiers(arachyls[i]), "NOT_ARACHYL");
            creationVerifiers[arachyls[i]] = true;

            // Signature checking against
            // this contract address
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(address(this), state));
      	    bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	    address _recover = ecrecover(_message, v[i], r[i], s[i]);
      	    require(_recover == arachyls[i],  "SIG");
        }

        _cleanCreation();

        _firstMint();

        address feeVault = ArachylInterface(factory).feeVault();
        FeeVaultInterface vault = FeeVaultInterface(feeVault);
        vault.rewardPairCreation(arachyls);

        emit Created();
    }

    // if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = FactoryInterface(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast; // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = Math.sqrt(uint(_reserve0).mul(_reserve1));
                uint rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = totalSupply.mul(rootK.sub(rootKLast));
                    uint denominator = rootK.mul(5).add(rootKLast);
                    uint liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }


    function _firstMint() internal lock returns (uint liquidity) {
        uint112 _reserve0 = 0;
        uint112 _reserve1 = 0;

        uint amount0 = lockedAmounts[0];
        uint amount1 = lockedAmounts[1];

        bool feeOn = _mintFee(_reserve0, _reserve1);

        // on each network minted half of the liquidity
        liquidity = Math.sqrt(amount0.mul(amount1)).div(2).sub(MINIMUM_LIQUIDITY);
        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens

        require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(creator, liquidity);

        _update(amount0, amount1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= 0xffffffffffffffffffffffffffff && balance1 <= 0xffffffffffffffffffffffffffff, 'UniswapV2: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    // // this low-level function should be called from a contract which performs important safety checks
    // function mint(uint[2] memory amounts, address to) public lock returns (uint liquidity) {
    //     (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
    //     uint balance0 = IERC20(token0).balanceOf(address(this));
    //     uint balance1 = IERC20(token1).balanceOf(address(this));
    //     uint amount0 = amounts[0];
    //     uint amount1 = amounts[1];

    //     bool feeOn = _mintFee(_reserve0, _reserve1);
    //     uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
    //     if (_totalSupply == 0) {
    //         liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
    //        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
    //     } else {
    //         liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
    //     }
    //     require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
    //     _mint(to, liquidity);

    //     _update(balance0, balance1, _reserve0, _reserve1);
    //     if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
    //     emit Mint(msg.sender, amount0, amount1);
    // }

    function revokeCreation(address[] calldata arachyls, uint8[] calldata v, bytes32[] calldata r, bytes32[] calldata s) external override {
        require(pendingCreation, "already confirmed");

        ArachylInterface arachyl = ArachylInterface(factory);

        uint8 b = arachyl.b();
        require(
            arachyls.length == b &&
            v.length == b && 
            r.length == b && 
            s.length == b, "NOT_THRESHOLD"
        );

        uint state = 2;

        for (uint8 i = 0; i < b; i++) {
            require(arachyls[i] != address(0), "ZERO_ADDRESS");            
            require(!creationVerifiers[arachyls[i]], "DUPLICATE_ARACHYL");
            require(arachyl.verifiers(arachyls[i]), "NOT_ARACHYL");
            creationVerifiers[arachyls[i]] = true;

            // Signature checking against
            // this contract address
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(address(this), state));
      	    bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	    address _recover = ecrecover(_message, v[i], r[i], s[i]);
      	    require(_recover == arachyls[i],  "SIG");
        }

        // disagreement among the verifiers. Therefore this verification failed.
        // cancel the creation, and let user start from the beginning.

        _transferBack();

        selfdestruct(FactoryInterface(factory).feeToSetter());

        _cleanCreation();
    }

    function _transferBack() internal {
        IERC20(thisToken).transfer(creator, lockedAmounts[0]);
    }

    function _cleanCreation() internal {
        pendingCreation = false;
    }

}
