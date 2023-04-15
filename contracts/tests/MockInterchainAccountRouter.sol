import {IInterchainAccountRouter} from '../hyperlane/interfaces/IInterchainAccountRouter.sol';
import {Call} from '../hyperlane/libs/Call.sol';

contract MockInterchainAccountRouter is IInterchainAccountRouter {
  event Dispatched(
    uint32 destinationDomain,
    address target,
    bytes4 functionSelector,
    uint32 remoteChainId,
    address fromToken,
    uint256 fromTokenAmount,
    address userAddress,
    uint256 requestId,
    uint256 fundIndex
  );

  function dispatch(
    uint32 _destinationDomain,
    Call[] calldata calls
  ) external returns (bytes32) {
    return keccak256('DUMMY_BYTES');
  }

  function dispatch(
    uint32 _destinationDomain,
    address target,
    bytes calldata data
  ) external returns (bytes32) {
    bytes4 functionSelector = bytes4(data[:4]);
    (
      uint32 remoteChainId,
      address fromToken,
      uint256 fromTokenAmount,
      address userAddress,
      uint256 requestId,
      uint256 fundIndex
    ) = abi.decode(
        data[4:],
        (uint32, address, uint256, address, uint256, uint256)
      );

    emit Dispatched(
      _destinationDomain,
      target,
      functionSelector,
      remoteChainId,
      fromToken,
      fromTokenAmount,
      userAddress,
      requestId,
      fundIndex
    );

    return keccak256('MockInterchainAccountRouter DUMMY_BYTES');
  }

  function getInterchainAccount(
    uint32 _originDomain,
    address _sender
  ) external view returns (address) {
    return address(111);
  }
}
