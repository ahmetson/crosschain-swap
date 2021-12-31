pragma solidity >=0.5.0;

interface PairInterface {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external pure returns (string memory);
    function symbol() external pure returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function thisToken() external view returns(address);
    function targetToken() external view returns(address);
    function pendingCreation() external view returns(bool);
    function lockedAmounts(uint) external view returns(uint256);              // Initial locked tokens. till approvement
    function creator() external view returns(address);              // Initial locked tokens. till approvement

    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);

    function initializeCreation(address[2] calldata, uint[2] calldata, address) external;

    function approveCreation(address[] calldata, uint8[] calldata, bytes32[] calldata, bytes32[] calldata) external;
    function revokeCreation(address[] calldata, uint8[] calldata, bytes32[] calldata, bytes32[] calldata) external;
}
