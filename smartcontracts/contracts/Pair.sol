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
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint)')));

    address public factory;
    address public verifierManager;
    address public thisToken;
    address public targetToken;

    bool    public pending;
    address public creator;
    uint[2] public lockedAmounts;               // Initial lockedAmounts tokens. till approvement

    uint approveVerificationAmount;
    uint disapproveVerificationAmount;
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
    function initialize(
        address[2] calldata _tokens,
        uint[2] calldata _amounts,
        address _creator
    ) external {
        require(msg.sender == factory, 'FORBIDDEN'); // sufficient check

        pending         = true;
        thisToken       = _tokens[0];
        targetToken     = _tokens[1];
        lockedAmounts   = _amounts;
        creator         = _creator;
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

        uint maxAmount = verifier.maxVerifiers();
        if (approveVerificationAmount >= verifier.minVerifiers()) {            
            _cleanCreation();

            emit Created();
        } else if (approveVerificationAmount + disapproveVerificationAmount >= maxAmount) {
            // disagreement among the verifiers. Therefore this verification failed.
            // cancel the creation, and let user start from the beginning.

            _transferBack();

            selfdestruct(FactoryInterface(factory).feeToSetter());

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
        IERC20(thisToken).transfer(creator, lockedAmounts[0]);
    }

    function _cleanCreation() internal {
        delete pending;

        delete approveVerificationAmount;
        delete disapproveVerificationAmount;
        delete creator;
    }

}
