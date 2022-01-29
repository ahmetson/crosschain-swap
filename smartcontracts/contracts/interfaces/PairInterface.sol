// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface PairInterface {
    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function thisToken() external view returns(address);
    function targetToken() external view returns(address);

    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);

    function create(address[2] calldata, uint[2] calldata, address) external;
}
