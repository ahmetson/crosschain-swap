pragma solidity =0.5.16;

interface ArachylInterface {
    function b() external view returns (uint8);

    function verifiersAmount() external view returns(uint);
    function verifiers(address) external view returns(bool);

    function verifierRegistration() external;
    function verifierDeregistration() external;
}
