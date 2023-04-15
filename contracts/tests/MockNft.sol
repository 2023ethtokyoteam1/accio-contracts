// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract MockNft is ERC721('MockNft', 'MNFT') {}