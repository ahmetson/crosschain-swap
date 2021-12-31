pragma solidity >=0.5.0;

interface FactoryInterface {
    event ChanPairCreated(uint indexed thisChainID, uint indexed targetChainID);
    event PairCreated(address indexed token0, address indexed token1, address pair, uint pairNumber);

    function verifierManager() external view returns (address);

    function getPair(address, address) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    // Creation
    function createPair(address[2] calldata tokens, uint256[2] calldata amounts) external returns (address pair);

    // Fee for Swapping
    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address payable);
    function setFeeTo(address) external;
    function setFeeToSetter(address payable) external;

    // Chain parameter
    function targetChainID() external view returns (uint256);
    function getChainID() external view returns (uint256);
}
