// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '../UniswapV2ERC20.sol';

contract ERC20 is UniswapV2ERC20 {
    constructor(string memory _name, string memory _symbol, uint _totalSupply) {
        name = _name;
        symbol = _symbol;
        _mint(msg.sender, _totalSupply);
    }
}
