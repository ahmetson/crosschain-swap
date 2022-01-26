// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface PairInterface {
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

    function approveCreation() external;
    function revokeCreation() external;

    function revokeBurn(address to) external;
    function revokeMint(address to) external;
}
