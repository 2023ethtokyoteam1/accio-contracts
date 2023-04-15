// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract SampleERC721 is ERC721, ERC721URIStorage, Ownable {
  uint256 private _tokenIdCounter;

  constructor() ERC721('SampleERC721', 'SERC721') {}

  function safeMint(address to, string memory tokenURI) public onlyOwner {
    uint256 tokenId = _tokenIdCounter;
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    _tokenIdCounter++;
  }

  function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
    super._burn(tokenId);
  }

  function tokenURI(
    uint256 tokenId
  ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
    return super.tokenURI(tokenId);
  }
}
