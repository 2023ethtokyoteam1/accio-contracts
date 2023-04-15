// SPDX-License-Identifier: Apache-2.0
// Hyperlane contract
// https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/main/solidity/interfaces/ILiquidityLayerMessageRecipient.sol

pragma solidity 0.8.19;

interface ILiquidityLayerMessageRecipient {
    // Gets called by the Hyperlane relayers. Calls the swap() on 1inch if necessary and
    // buy NFT on an NFT Marketplace.
    function handleWithTokens(uint32 origin, bytes32 sender, bytes calldata message, address token, uint256 amount)
        external;
}
