// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ERC20Upgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import {TypeCasts} from '@hyperlane-xyz/core/contracts/libs/TypeCasts.sol';
import {Message} from '../hyperlane/libs/Message.sol';

contract MockHypERC20 is ERC20Upgradeable {
  using TypeCasts for bytes32;
  using Message for bytes;
  /**
   * @dev Emitted on `transferRemote` when a transfer message is dispatched.
   * @param destination The identifier of the destination chain.
   * @param recipient The address of the recipient on the destination chain.
   * @param amount The amount of tokens burnt on the origin chain.
   */
  event SentTransferRemote(
    uint32 indexed destination,
    bytes32 indexed recipient,
    uint256 amount,
    address la,
    bytes funcData,
    uint256 gasPayment,
    address refundAddress
  );

  /**
   * @notice Initializes the Hyperlane router, ERC20 metadata, and mints initial supply to deployer.
   * @param _totalSupply The initial supply of the token.
   * @param _name The name of the token.
   * @param _symbol The symbol of the token.
   */
  function initialize(
    uint256 _totalSupply,
    string memory _name,
    string memory _symbol
  ) external initializer {
    // Initialize ERC20 metadata
    __ERC20_init(_name, _symbol);
    _mint(msg.sender, _totalSupply);
  }

  /**
   * @notice Transfers `_amountOrId` token to `_recipient` on `_destination` domain.
   * @dev Delegates transfer logic to `_transferFromSender` implementation.
   * @dev Emits `SentTransferRemote` event on the origin chain.
   * @param _destination The identifier of the destination chain.
   * @param _recipient The address of the recipient on the destination chain.
   * @param _amountOrId The amount or identifier of tokens to be sent to the remote recipient.
   * @return messageId The identifier of the dispatched message.
   */
  function transferRemote(
    uint32 _destination,
    bytes32 _recipient,
    uint256 _amountOrId,
    bytes calldata data
  ) external payable virtual returns (bytes32 messageId) {
    _transferFromSender(_amountOrId);

    // messageId = _dispatchWithGas(
    //   _destination,
    //   Message.format(_recipient, _amountOrId, data),
    //   msg.value, // interchain gas payment
    //   msg.sender // refund address
    // );
    messageId = keccak256('MockWethToken DUMMY_BYTES');

    (address la, bytes memory funcData) = abi.decode(data, (address, bytes));
    emit SentTransferRemote(
      _destination,
      _recipient,
      _amountOrId,
      la,
      funcData,
      msg.value,
      msg.sender
    );
  }

  /**
   * @dev Burns `_amount` of token from `msg.sender` balance.
   */
  function _transferFromSender(
    uint256 _amount
  ) internal returns (bytes memory) {
    _burn(msg.sender, _amount);
    return bytes(''); // no metadata
  }
}
