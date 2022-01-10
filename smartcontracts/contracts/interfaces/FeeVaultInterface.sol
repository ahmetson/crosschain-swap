// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface FeeVaultInterface {
    function rewardPairCreation(address[] calldata arachyls) external;
    function rewardFeeUpdate(address[] calldata arachyls) external;
}
