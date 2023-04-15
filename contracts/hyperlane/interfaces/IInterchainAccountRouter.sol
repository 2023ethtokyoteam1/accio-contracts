// SPDX-License-Identifier: MIT OR Apache-2.0
// Hyperlane contract
// https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/1.0.0-beta8/solidity/interfaces/IInterchainAccountRouter.sol
pragma solidity >=0.6.11;

import {Call} from '../libs/Call.sol';

interface IInterchainAccountRouter {
    function dispatch(uint32 _destinationDomain, Call[] calldata calls)
        external
        returns (bytes32);

    function dispatch(
        uint32 _destinationDomain,
        address target,
        bytes calldata data
    ) external returns (bytes32);

    function getInterchainAccount(uint32 _originDomain, address _sender)
        external
        view
        returns (address);
}
