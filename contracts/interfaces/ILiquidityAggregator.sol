// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

interface ILiquidityAggregator {
  struct NftInfo {
    address nftContract;
    uint256 nftId;
  }

  // NOTE: Initially we're assuming the user will use
  // 1 wallet address across multiple chains
  struct Fund {
    uint32 chainId;
    address localWeth;
    uint256 localWethAmount;
  }

  struct FundWithStatus {
    Fund fund;
    uint256 index;
    bool fulfilled;
  }

  struct Request {
    address sender;
    NftInfo nftInfo;
  }

  // Gets called by the UI. Creates a request ID and
  // calls dispatch() on Hyperlane InterchainAccountRouter.
  function buy(
    NftInfo calldata nftInfo,
    Fund[] calldata funds
  ) external returns (uint256);

  // Gets called by the hyperlane relayer. Calls the swap() on 1inch if necessary and
  // dispatchWithTokens() on Hyperlane LiquidityLayerRouter.
  function getUserTokens(
    uint32 chainId,
    address localWeth,
    uint256 localWethAmount,
    address userAddress,
    uint256 requestId,
    uint256 fundIndex
  ) external;
}
