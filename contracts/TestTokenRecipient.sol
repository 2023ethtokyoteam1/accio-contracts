// SPDX-License-Identifier: MIT OR Apache-2.0
// Forked from https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/main/solidity/contracts/test/TestTokenRecipient.sol
// Difference: Set bridged token to `balances`, which can be claimed by the `_sender` address of `handleWithTokens`.
pragma solidity >=0.8.0;

import {ILiquidityLayerMessageRecipient} from './hyperlane/interfaces/ILiquidityLayerMessageRecipient.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract TestTokenRecipient is ILiquidityLayerMessageRecipient {
  bytes32 public lastSender;
  bytes public lastData;
  address public lastToken;
  uint256 public lastAmount;
  mapping(address => mapping(address => uint256)) public balances;

  event ReceivedMessage(
    uint32 indexed origin,
    bytes32 indexed sender,
    string message,
    address token,
    uint256 amount
  );

  event ReceivedCall(address indexed caller, uint256 amount, string message);

  function handleWithTokens(
    uint32 _origin,
    bytes32 _sender,
    bytes calldata _data,
    address _token,
    uint256 _amount
  ) external override {
    emit ReceivedMessage(_origin, _sender, string(_data), _token, _amount);
    lastSender = _sender;
    lastData = _data;
    lastToken = _token;
    lastAmount = _amount;
    balances[address(uint160(uint256(_sender)))][_token] += _amount;
  }

  function claim(address token) external {
    require(balances[msg.sender][token] != 0, 'no balance');
    IERC20(token).transfer(msg.sender, balances[msg.sender][token]);
  }
}
