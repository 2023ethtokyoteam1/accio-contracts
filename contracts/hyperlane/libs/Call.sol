// SPDX-License-Identifier: Apache-2.0
// Hyperlane contract
// https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/1.0.0-beta8/solidity/contracts/Call.sol
pragma solidity ^0.8.13;

struct Call {
    address to;
    bytes data;
}
