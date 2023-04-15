pragma solidity >=0.6.11;

contract MockInterchainGasPaymaster {
  function payForGas(
    bytes32 _messageId,
    uint32 _destinationDomain,
    uint256 _gasAmount,
    address _refundAddress
  ) external payable {}

  function quoteGasPayment(
    uint32 _destinationDomain,
    uint256 _gasAmount
  ) external view returns (uint256) {
    return 0.001 ether;
  }
}
