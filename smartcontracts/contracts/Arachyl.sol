// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './interfaces/ArachylInterface.sol';
import './interfaces/FeeVaultInterface.sol';

/**
 *  todo add verifier managers
 */
contract Arachyl is ArachylInterface {
    address payable public override feeVault;

    /// @notice Threshold amount of signatures this one is requiring
    /// @dev Naming taken from Avalance consensus protocol documentation
    uint8 public override b = 2;

    uint public override verifiersAmount;
    mapping(address => bool) override public verifiers;

    // Amount of tokens that user has to pay
    uint public override feeForArachyls;            
    uint public override feeUserPairCreation;
    uint public feeTimestamp;                                       // last timestamp when it was updated
    uint public override feeVaultPercents            = 10;
    uint public feeInterval                 = 300;                                        // amount of seconds that should pass before updating fee
    mapping(uint => mapping(address => bool)) public feeUpdaters;

    event FeeVault(address indexed vault);

    event VerifierRegistration(address indexed verifier, uint amount);
    event VerifierDeregistration(address indexed verifier, uint amount);

    event FeeUpdate(uint indexed forArachyls, uint indexed pairCreation, uint timestamp);

    function setFeeVault(address payable _feeVault) external {
        require(feeVault == address(0), "ALREADY_SET");
        require(_feeVault != address(0), "ZERO_ADDRESS");
        feeVault = _feeVault;

        emit FeeVault(feeVault);
    }

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

    function feeInit() internal {
        feeUserPairCreation = 3419909448362304;
        feeForArachyls      = 215052909743664;

        emit FeeUpdate(feeForArachyls, feeUserPairCreation, 0);
    }

    function feeUpdate(uint _pairCreation, uint _forArachyls, address[] calldata arachyls, uint8[] calldata v, bytes32[] calldata r, bytes32[] calldata s) external {
        require(feeTimestamp + feeInterval <= block.timestamp, "too early");
        
        for (uint8 i = 0; i < b; i++) {
            require(arachyls[i] != address(0), "ZERO_ADDRESS");            
            require(!feeUpdaters[block.timestamp][arachyls[i]], "DUPLICATE_ARACHYL");
            require(verifiers[arachyls[i]], "NOT_ARACHYL");
            feeUpdaters[block.timestamp][arachyls[i]] = true;

            // Signature checking against
            // this contract address
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(address(this), feeTimestamp, _pairCreation, _forArachyls));
      	    bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	    address _recover = ecrecover(_message, v[i], r[i], s[i]);
      	    require(_recover == arachyls[i],  "SIG");
        }

        feeTimestamp        = block.timestamp;
        feeForArachyls      = _forArachyls;
        feeUserPairCreation = _pairCreation;

        FeeVaultInterface vault = FeeVaultInterface(feeVault);
        vault.rewardFeeUpdate(arachyls);

        emit FeeUpdate(_forArachyls, _pairCreation, block.timestamp);
    }
}
