// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './interfaces/ArachylInterface.sol';

/**
 *  todo add verifier managers
 */
contract Arachyl is ArachylInterface {
    /// @notice Threshold amount of signatures this one is requiring
    /// @dev Naming taken from Avalance consensus protocol documentation
    uint8 public override b = 2;

    uint public override verifiersAmount;
    mapping(address => bool) override public verifiers;

    event VerifierRegistration(address indexed verifier, uint amount);
    event VerifierDeregistration(address indexed verifier, uint amount);

    function verifierRegistration() override external {
        require(verifiers[msg.sender] == false, "ADDED");
        verifiers[msg.sender] = true;
        verifiersAmount++;

        emit VerifierRegistration(msg.sender, verifiersAmount);
    }

    function verifierDeregistration() override external {
        require(verifiers[msg.sender] == true, "NOT_ADDED");
        delete verifiers[msg.sender];
        verifiersAmount--;

        emit VerifierDeregistration(msg.sender, verifiersAmount);
    }
}
