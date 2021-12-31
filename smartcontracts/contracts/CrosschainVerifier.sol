pragma solidity =0.5.16;

/**
 *  todo add verifier managers
 */
contract CrosschainVerifier {
    uint256 verifiersAmount;
    uint256 threshold;          // minimum amount of verifiers out of verifiersAmount
                                // who can approve the transaction.

    uint256 addedVerifiers;
    mapping(address => bool) public verifiers;

    constructor(uint256 _verifiersAmount, uint256 _threshold) public {
        require(_threshold > 0 && _verifiersAmount >= _threshold);
        require(_verifiersAmount > 0, "0");
        verifiersAmount = _verifiersAmount;
    }

    function addVerifier(address _verifier) external {
        require(addedVerifiers + 1 <= verifiersAmount, "EXCEED");
        verifiers[_verifier] = true;
        addedVerifiers++;
    }

    function removeVerifier(address _verifier) external {
        delete verifiers[_verifier];
        addedVerifiers--;
    }

    function isVerifier(address _verifier) external view returns(bool) {
        return verifiers[_verifier];
    }

    function maxVerifiers() external view returns(uint256) {
        return verifiersAmount;
    }

    function minVerifiers() external view returns(uint256) {
        return threshold;
    }
}
