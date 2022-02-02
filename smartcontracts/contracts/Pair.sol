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


contract Pair is PairInterface, UniswapV2ERC20 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public constant APPROVE_STATE = 1;
    uint public constant REVOKE_STATE = 2;

    uint public override constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint)')));

    address public override factory;
    address public override thisToken;
    address public override targetToken;

    struct MintParams {
        uint amount0;
        uint amount1;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct SwapParams {
        uint amount0Out;
        uint amount1Out;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct SwapTargetParams {
        uint amountOut;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct SwapSourceParams {
        uint amountIn;
        uint amountOut;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    mapping(address => uint) public nonceOf;

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

    event Mint(address indexed sender, uint amount0, uint amount1, uint liq);
    event Burn(address indexed to, uint indexed amount0, uint indexed amount1, uint liq);
    event Swap(address indexed to, uint[4] amounts);
    event Sync(uint112 reserve0, uint112 reserve1);
    event Created();
    event Destroyed();

    modifier validMintSig(MintParams memory params) {
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nonceOf[msg.sender], params.amount0, params.amount1, msg.sender));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, params.v, params.r, params.s);

        ArachylInterface arachyl = ArachylInterface(factory);

        require(arachyl.verifiers(_recover), "NOT_MINT_SIG");
        _;
        nonceOf[msg.sender]++;
    }

    modifier validSwapSig(SwapParams memory params) {
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nonceOf[msg.sender], params.amount0Out, params.amount1Out, msg.sender));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, params.v, params.r, params.s);

        ArachylInterface arachyl = ArachylInterface(factory);

        require(arachyl.verifiers(_recover), "NOT_MINT_SIG");
        _;
        nonceOf[msg.sender]++;
    }

    modifier validSwapSourceSig(SwapSourceParams memory params) {
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nonceOf[msg.sender], params.amountIn, params.amountOut, msg.sender));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, params.v, params.r, params.s);

        ArachylInterface arachyl = ArachylInterface(factory);

        require(arachyl.verifiers(_recover), "NOT_MINT_SIG");
        _;
        nonceOf[msg.sender]++;
    }

    modifier validSwapTargetSig(SwapTargetParams memory params) {
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nonceOf[msg.sender], params.amountOut, msg.sender));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, params.v, params.r, params.s);

        ArachylInterface arachyl = ArachylInterface(factory);

        require(arachyl.verifiers(_recover), "NOT_MINT_SIG");
        _;
        nonceOf[msg.sender]++;
    }

    constructor() {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment
    // The verifier picks the data, after matching with another part, verifier approves it.
    function create(
        address[2] calldata _tokens,
        uint[2] calldata _amounts,
        address _creator
    ) external override {
        require(msg.sender == factory, 'FORBIDDEN'); // sufficient check

        thisToken           = _tokens[0];
        targetToken         = _tokens[1];

        _firstMint(_creator, _amounts[0], _amounts[1]);

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

    function _firstMint(address creator, uint amount0, uint amount1) internal lock returns (uint liquidity) {
        // pass 0 reserve
        bool feeOn = _mintFee(0, 0);

        liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens

        require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(creator, liquidity);

        // pass 0 reserve
        _update(amount0, amount1, 0, 0);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1, liquidity);
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

    /// @dev The validation is done by the Signers. We trust them.
    function mint(MintParams memory params) public 
        validMintSig(params) 
        lock 
        returns 
        (uint liquidity) 
    {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings

        uint preBalance = IERC20(thisToken).balanceOf(address(this));

        require(IERC20(thisToken).transferFrom(msg.sender, address(this), params.amount0), "FAILED_TO_TRANSFER_TOKEN");
        uint balance0 = IERC20(thisToken).balanceOf(address(this));
        uint balance1 = _reserve1 + params.amount1;

        params.amount0 = balance0.sub(preBalance);

        // todo: need to be sure that user adds exact params
        // liquidity = Math.min(params.amount0.mul(totalSupply) / _reserve0, params.amount1.mul(totalSupply) / _reserve1);
        liquidity = params.amount0.mul(totalSupply) / _reserve0;
        require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');

        bool feeOn = _mintFee(_reserve0, _reserve1);

        _mint(msg.sender, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, params.amount0, params.amount1, liquidity);
    }

    // Need to call another function after this one. Since Burning will calculate the amount that user can withdraw.
    function burn(uint amount) external lock returns (uint amount0, uint amount1) {
        require(balanceOf[msg.sender] >= amount, "INVALID_BALANCE");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings

        // transfer into the contract
        // this.transferFrom(msg.sender, address(this), amount);
        _transfer(msg.sender, address(this), amount);

        uint balance0       = IERC20(thisToken).balanceOf(address(this));
        uint balance1       = _reserve1;

        uint liquidity      = balanceOf[address(this)];

        bool feeOn          = _mintFee(_reserve0, _reserve1);

        uint _totalSupply   = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee

        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');

        _burn(address(this), amount);

        uint preBalance     = IERC20(thisToken).balanceOf(address(this));

        IERC20(thisToken).transfer(msg.sender, amount0);

        uint postBalance     = IERC20(thisToken).balanceOf(address(this));

        amount0 = preBalance.sub(postBalance);

        balance0 = IERC20(thisToken).balanceOf(address(this));
        balance1 = uint(_reserve1).sub(amount1);                // todo make sure that token is not deflationary token
                                                                // since we deduct it from the server.

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, amount);
    }

    function swap(SwapParams memory params) ///, bytes calldata data) enabling data will cause stack too depp
        external
        validSwapSig(params) 
        lock 
    {
        // require(params.amount0Out > 0 || params.amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        require(params.amount0Out == 0 || params.amount1Out == 0, "BOTH_SIDE_SWAP");


        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        // require(params.amount0Out < _reserve0 && params.amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');


        uint balance0;
        uint balance1 = _reserve1 - params.amount1Out; // = _reserve1 - amount1Out; defleationary token might cause an issue
        { // scope for _token{0,1}, avoids stack too deep errors

        // require(msg.sender != thisToken && msg.sender != targetToken, 'INVALID_TO');


        if (params.amount0Out > 0) {
            uint preBalance = IERC20(thisToken).balanceOf(address(this));
            IERC20(thisToken).transfer(msg.sender, params.amount0Out);
            // _safeTransfer(thisToken, msg.sender, params.amount0Out); // optimistically transfer tokens

            params.amount0Out = IERC20(thisToken).balanceOf(address(this)).sub(preBalance);
        }

        // swapping token on this blockchain to the token on another chain?
        // great, transfer into this contract the tokens from the user on this blockchain.
        if (params.amount1Out > 0) {
            uint numerator = uint(_reserve0).mul(params.amount1Out).mul(1000);    // reserve in
            uint denominator = uint(_reserve1).sub(params.amount1Out).mul(997);       // reserve out
            uint amountIn = (numerator / denominator).add(1);

            // deflationary token
            IERC20(thisToken).transferFrom(msg.sender, address(this), amountIn);
        }

        // if (data.length > 0) {
            // IUniswapV2Callee(msg.sender).uniswapV2Call(msg.sender, params.amount0Out, params.amount1Out, data);
        // }
        
        balance0 = IERC20(thisToken).balanceOf(address(this));
        }

        uint amount0In = balance0 > _reserve0 - params.amount0Out ? balance0 - (_reserve0 - params.amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - params.amount1Out ? balance1 - (_reserve1 - params.amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, [amount0In, amount1In, params.amount0Out, params.amount1Out]);
    }


    // this low-level function should be called from a contract which performs important safety checks
    // params.amount1Out means user withdraws the token on the target blockchain
    // params.amount0Out means user withdraws the token on this blockchai
    //
    // note, that client should calculate exact amount out
    // on uniswap its done by the periphery contract. maybe to add periphery too?
    //
    // maybe to accept the amount ins, and calculate the amount out. since while user is passing the 
    // transaction on another blockchain, the ratio of the tokens in the pair might be changed. so
    // user's swap in ratio will be unlikely high.
    // create another swap for source initiated tokens.
    //
    // amount in is on source chain
    // amount out is on the target chain
    // 
    // this method doesn't require a validation.
    function swapToTarget(SwapTargetParams memory params) ///, bytes calldata data) enabling data will cause stack too depp
        external
        /// validSwapTargetSig(params) 
        lock 
    {
        // require(params.amount0Out > 0 || params.amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        require(params.amountOut > 0, "BOTH_SIDE_SWAP");


        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        // require(params.amount0Out < _reserve0 && params.amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');


        uint balance0;
        uint amount0In;
        // test that token is not defletionary
        uint balance1 = _reserve1 - params.amountOut; // = _reserve1 - amount1Out; defleationary token might cause an issue

        // require(msg.sender != thisToken && msg.sender != targetToken, 'INVALID_TO');
        {
        // swapping token on this blockchain to the token on another chain?
        // great, transfer into this contract the tokens from the user on this blockchain.
        // calculating amount in on source blockchain
        uint numerator = uint(_reserve0).mul(params.amountOut).mul(1000);    // reserve in
        uint denominator = uint(_reserve1).sub(params.amountOut).mul(997);       // reserve out
        amount0In = (numerator / denominator).add(1);
        require(amount0In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');

        // deflationary token
        IERC20(thisToken).transferFrom(msg.sender, address(this), amount0In);
        // if (data.length > 0) {
            // IUniswapV2Callee(msg.sender).uniswapV2Call(msg.sender, params.amount0Out, params.amount1Out, data);
        // }
        
        balance0 = IERC20(thisToken).balanceOf(address(this));
        }

        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        uint balance1Adjusted = balance1.mul(1000);
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, [amount0In, 0, 0, params.amountOut]);
    }

    // amount in is on the target chain
    // amount out is on the source chain
    // the process of swapping from target to source, requires TargetChain.deposit first.
    function swapToSource(SwapSourceParams memory params) ///, bytes calldata data) enabling data will cause stack too depp
        external
        validSwapSourceSig(params) 
        lock 
    {
        // require(params.amount0Out > 0 || params.amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        require(params.amountOut > 0, "0");


        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        // require(params.amount0Out < _reserve0 && params.amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');


        uint balance0;
        uint balance1 = _reserve1 - params.amountIn; // = _reserve1 - amount1Out; defleationary token might cause an issue
        { // scope for _token{0,1}, avoids stack too deep errors

        // require(msg.sender != thisToken && msg.sender != targetToken, 'INVALID_TO');

        uint preBalance = IERC20(thisToken).balanceOf(address(this));
        IERC20(thisToken).transfer(msg.sender, params.amountOut);
        params.amountOut = IERC20(thisToken).balanceOf(address(this)).sub(preBalance);

        // if (data.length > 0) {
            // IUniswapV2Callee(msg.sender).uniswapV2Call(msg.sender, params.amount0Out, params.amount1Out, data);
        // }
        
        balance0 = IERC20(thisToken).balanceOf(address(this));
        }

        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(1000);//
        uint balance1Adjusted = balance1.mul(1000).sub(params.amountIn.mul(3));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, [0, params.amountIn, params.amountOut, 0]);
    }
}
