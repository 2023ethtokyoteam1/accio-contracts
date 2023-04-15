// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockWethToken is ERC20('Wrapped Ether', 'WETH') {
  constructor() {
    _mint(msg.sender, 1000000000 ether);
  }

  function mint(uint256 _amount) external {
    _mint(msg.sender, _amount);
  }
}