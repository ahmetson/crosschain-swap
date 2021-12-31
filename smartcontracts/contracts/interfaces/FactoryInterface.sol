pragma solidity >=0.5.0;

interface FactoryInterface {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint pairNumber, uint chain0, uint chain1);

    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);
    function verifierManager() external view returns (address);

    function firstToLastCrosses(uint256) external view returns (uint256);
    function offsets(uint256) external view returns(uint256);

    function addBlockchainPair(uint256 _firstChainID, uint256 _lastChainID, uint256 _lastOffset) external returns (bool);


    function getPair(uint256, uint256, address, address) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address[2] calldata tokens, 
            uint256[2] calldata amounts, 
            uint256 targetChainID 
    ) external returns (address pair);

    function setFeeTo(address) external;
    function setFeeToSetter(address) external;

    function getChainID() external view returns (uint256);
    function validBlockchainPair(uint256 thisChainID, uint256 targetChainID) external view returns (bool);
    function chainPairOrder(uint256 thisChainID, uint256 targetChainID) external view returns (uint256, uint256);
    function firstChain(uint256 thisChainID) external view returns (bool);
}
