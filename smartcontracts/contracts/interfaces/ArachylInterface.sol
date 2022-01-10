// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface ArachylInterface {
    function feeVault() external view returns (address payable);

    function b() external view returns (uint8);

    function feeUserPairCreation() external view returns(uint);
    function feeForArachyls() external view returns(uint);
    function feeVaultPercents() external view returns(uint);

    function verifiersAmount() external view returns(uint);
    function verifiers(address) external view returns(bool);

    function verifierRegistration() external;
    function verifierDeregistration() external;
}
