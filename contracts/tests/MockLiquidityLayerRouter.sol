// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ILiquidityLayerRouter} from '../hyperlane/interfaces/ILiquidityLayerRouter.sol';

contract MockLiquidityLayerRouter is ILiquidityLayerRouter {
  event DispatchedWithTokens(
    uint32 destinationDomain,
    bytes32 recipientAddress,
    address token,
    uint256 amount,
    string bridge,
    uint256 requestId,
    uint256 fundIndex
  );

  function dispatchWithTokens(
    uint32 _destinationDomain,
    bytes32 _recipientAddress,
    address _token,
    uint256 _amount,
    string calldata _bridge,
    bytes calldata _messageBody
  ) external returns (bytes32) {
    (uint256 requestId, uint256 fundIndex) = abi.decode(_messageBody, (uint256, uint256));
    emit DispatchedWithTokens(
      _destinationDomain,
      _recipientAddress,
      _token,
      _amount,
      _bridge,
      requestId,
      fundIndex
    );

    return keccak256('MockLiquidityLayerRouter DUMMY_BYTES');
  }
}