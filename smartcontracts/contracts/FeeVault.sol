// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import './libraries/SafeMath.sol';
import './interfaces/ArachylInterface.sol';
import './interfaces/FactoryInterface.sol';
import './interfaces/PairInterface.sol';

/**
    FeeVault is accessible only from Factory and Pair contracts.
    From Factory and Pair contracts it receives the Native Coin.

    And a signal, which upon receiving it transfers some fee to token distributers 

    Reward Type
    0 - fee update
    1 - pair creatin
 */
contract FeeVault {
    using SafeMath  for uint;

    address public factory;

    event Reward(address indexed arachyl, uint amount, uint8 rewardType);

    modifier onlyPair() {
        FactoryInterface fact = FactoryInterface(factory);
        PairInterface pair = PairInterface(msg.sender);
        // get token0 and token1
        address thisToken = pair.thisToken();
        address targetToken = pair.targetToken();
        require(fact.getPair(thisToken, targetToken) == msg.sender, "ONLY_PAIR");
        _;
    }

    modifier onlyFactory() {
        require(factory == msg.sender, "ONLY_PAIR");
        _;
    }

    constructor (address _factory) {
        factory = _factory;
    }

    function rewardPairCreation(address[] calldata arachyls) onlyPair external {
        ArachylInterface arachylLib = ArachylInterface(factory);
        
        // get from factory's arachyl interface fee price for pair creation
        // get from factory's arachyl interface vault fee percents
        uint feePairCreation = arachylLib.feeUserPairCreation();
        uint feePercents = arachylLib.feeVaultPercents();

        // divides fee to 100
        uint percent = feePairCreation.div(100);

        // then gets 90% of pair creation fee
        uint totalReward = uint(100).sub(feePercents).mul(percent);
        require(address(this).balance >= totalReward, "NOT_ENOUGH_FUNDS");

        // then get threshold from factory's interface
        uint8 b = arachylLib.b();

        // then divided pair creation fee to threshold number
        uint reward = totalReward.div(b);

        // and over the loop, transfer it to arachyls
        for (uint8 i = 0; i < b; i++) {
            payable(arachyls[i]).transfer(reward);

            emit Reward(arachyls[i], reward, 1);
        }
    }

    function rewardFeeUpdate(address[] calldata arachyls) onlyFactory external {
        ArachylInterface arachylLib = ArachylInterface(factory);

        // get from factory's arachyl interface fee price for arachyls
        uint forArachyls = arachylLib.feeForArachyls();

        // set reward fee = this.balance < fee for arachyls ? this.balance : fee for arachyls
        uint totalReward = address(this).balance < forArachyls ? address(this).balance : forArachyls;
        require(totalReward > 0, "NOT_ENOUGH_FUNDS");

        // then get threshold from factory's interface
        uint8 b = arachylLib.b();

        // then divided reward fee to threshold number
        uint reward = totalReward.div(b);

        // and over the loop, transfer it to arachyls
        // and over the loop, transfer it to arachyls
        for (uint8 i = 0; i < b; i++) {
            payable(arachyls[i]).transfer(reward);

            emit Reward(arachyls[i], reward, 0);
        }
    }
}
