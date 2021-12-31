pragma solidity =0.5.16;

import './interfaces/ArachylInterface.sol';

/**
 *  todo add verifier managers
 */
contract Arachyl is ArachylInterface {
    /// @notice Threshold amount of signatures this one is requiring
    /// @dev Naming taken from Avalance consensus protocol documentation
    uint8 public b = 2;

    uint public verifiersAmount;
    mapping(address => bool) public verifiers;

    event VerifierRegistration(address indexed verifier, uint amount);
    event VerifierDeregistration(address indexed verifier, uint amount);

    function verifierRegistration() external {
        require(verifiers[msg.sender] == false, "ADDED");
        verifiers[msg.sender] = true;
        verifiersAmount++;

        emit VerifierRegistration(msg.sender, verifiersAmount);
    }

    function verifierDeregistration() external {
        require(verifiers[msg.sender] == true, "NOT_ADDED");
        delete verifiers[msg.sender];
        verifiersAmount--;

        emit VerifierDeregistration(msg.sender, verifiersAmount);
    }
}
