pragma solidity =0.5.16;

import './UniswapV2ERC20.sol';
import './libraries/Math.sol';
import './libraries/UQ112x112.sol';
import './interfaces/IERC20.sol';
import './interfaces/PairInterface.sol';
import './interfaces/FactoryInterface.sol';
import './interfaces/IUniswapV2Callee.sol';
import './CrosschainVerifier.sol';

contract Pair is PairInterface, UniswapV2ERC20 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    address public factory;
    address public verifierManager;
    address public thisToken;
    address public targetToken;
    uint256 public offset;
    bool    public pending;
    uint256 public thisChainID;
    uint256 public targetChainID;
    address public creator;
    uint256[2] public locked;               // Initial locked tokens. till approvement

    uint256 approveVerificationAmount;
    uint256 disapproveVerificationAmount;
    mapping(address => bool) creationVerifiers;     // verified

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'UniswapV2: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
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
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    event Created();
    event Destroyed();

    constructor() public {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment
    // Initialize in the pending mode that Pair Creation announced.
    // The verifier picks the data, after matching with another part, verifier approves it.
    /// @param _offset on this blockchain offset.
    function initialize(
        bool isFirst
        , uint256 chain0 
        , address token0 
        , uint256 chain1 
        , address token1 
        , uint256[2] calldata amounts
        , uint256 _offset
        , address[2] calldata addresses
    ) external {
        require(msg.sender == factory, 'UniswapV2: FORBIDDEN'); // sufficient check
        pending = true;
        if (isFirst) {
            thisToken = token0;
            thisChainID = chain0;
            targetChainID = chain1;
            targetToken = token1;
            locked = [amounts[0], amounts[1]];
        } else {
            thisToken = token1;
            thisChainID = chain1;
            targetChainID = chain0;
            targetToken = token0;
            offset = _offset;
            locked = [amounts[1], amounts[0]];
        }

        creator = addresses[0];
        verifierManager = addresses[1];
    }

    /**
     * todo Make sure that this one is called by the verifier
     *
     * todo pass the v,r,s just to make sure that the verifier checked the data correctly.
     */
    function approveCreation() external {
        require(pending, "already confirmed");

        CrosschainVerifier verifier = CrosschainVerifier(verifierManager);
        require(verifier.isVerifier(msg.sender), "no_permission");
        require(!creationVerifiers[msg.sender], "already_submitted");

        creationVerifiers[msg.sender] = true;
        approveVerificationAmount++;

        uint256 maxAmount = verifier.maxVerifiers();
        if (approveVerificationAmount >= verifier.minVerifiers()) {            
            _mintFirst(creator);
            
            _cleanCreation();

            emit Created();
        } else if (approveVerificationAmount + disapproveVerificationAmount >= maxAmount) {
            // disagreement among the verifiers. Therefore this verification failed.
            // cancel the creation, and let user start from the beginning.

            _transferBack();

            selfdestruct(FactoryInterface(factory).feeToSetter);

            _cleanCreation();
        }
    }

    /**
     * todo Make sure that this one is called by the verifier
     */
    function disapproveCreation() external {
        require(pending, "already confirmed");

    }

    function _transferBack() internal {
        IERC20(thisToken).transfer(creator, locked[0]);
    }

    function _cleanCreation() internal {
        delete pending;

        delete creationVerifiers;
        delete approveVerificationAmount;
        delete disapproveVerificationAmount;
        delete creator;
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= uint112(-1) && balance1 <= uint112(-1), 'UniswapV2: OVERFLOW');
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

    // this low-level function should be called from a contract which performs important safety checks
    function _mintFirst(address to) internal lock returns (uint liquidity) {
        uint112 _reserve0 = 0;
        uint112 _reserve1 = 0;
        uint balance0 = locked[0];
        uint balance1 = locked[1];
        uint amount0 = balance0;
        uint amount1 = balance1;

        // todo deal with fees, fee is not part of liquidity, but its the CWS tokens.
        // bool feeOn = _mintFee(_reserve0, _reserve1);
        bool feeOn = false;

        liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens

        require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        // todo part of fee management.
        // if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(to, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function mint(address to) external lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint balance0 = IERC20(thisToken).balanceOf(address(this));
        uint balance1 = IERC20(targetToken).balanceOf(address(this));
        uint amount0 = balance0.sub(_reserve0);
        uint amount1 = balance1.sub(_reserve1);

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
           _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
        }
        require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function burn(address to) external lock returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _thisToken = thisToken;                                // gas savings
        address _targetToken = targetToken;                                // gas savings
        uint balance0 = IERC20(_thisToken).balanceOf(address(this));
        uint balance1 = IERC20(_targetToken).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
        _burn(address(this), liquidity);
        _safeTransfer(_thisToken, to, amount0);
        _safeTransfer(_targetToken, to, amount1);
        balance0 = IERC20(_thisToken).balanceOf(address(this));
        balance1 = IERC20(_targetToken).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        address _thisToken = thisToken;
        address _targetToken = targetToken;
        require(to != _thisToken && to != _targetToken, 'UniswapV2: INVALID_TO');
        if (amount0Out > 0) _safeTransfer(_thisToken, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) _safeTransfer(_targetToken, to, amount1Out); // optimistically transfer tokens
        if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        balance0 = IERC20(_thisToken).balanceOf(address(this));
        balance1 = IERC20(_targetToken).balanceOf(address(this));
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // force balances to match reserves
    function skim(address to) external lock {
        address _thisToken = thisToken; // gas savings
        address _targetToken = targetToken; // gas savings
        _safeTransfer(_thisToken, to, IERC20(_thisToken).balanceOf(address(this)).sub(reserve0));
        _safeTransfer(_targetToken, to, IERC20(_targetToken).balanceOf(address(this)).sub(reserve1));
    }

    // force reserves to match balances
    function sync() external lock {
        _update(IERC20(thisToken).balanceOf(address(this)), IERC20(targetToken).balanceOf(address(this)), reserve0, reserve1);
    }
}