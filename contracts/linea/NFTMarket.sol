// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract NFTMarket is ERC721Holder, ReentrancyGuard {
  struct Offer {
    bool isForSale;
    uint256 tokenId;
    address seller;
    uint256 price;
  }

  mapping(uint256 => Offer) public offers;
  IERC20 public acceptedToken;
  IERC721 public nftContract;

  event OfferCreated(
    uint256 indexed tokenId,
    address indexed seller,
    uint256 price
  );
  event OfferCancelled(uint256 indexed tokenId);
  event NFTSold(
    uint256 indexed tokenId,
    address indexed seller,
    address indexed buyer,
    uint256 price
  );

  constructor(address _acceptedToken, address _nftContract) {
    acceptedToken = IERC20(_acceptedToken);
    nftContract = IERC721(_nftContract);
  }

  function createOffer(uint256 _tokenId, uint256 _price) external {
    require(nftContract.ownerOf(_tokenId) == msg.sender, 'Not the token owner');
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

    offers[_tokenId] = Offer({
      isForSale: true,
      tokenId: _tokenId,
      seller: msg.sender,
      price: _price
    });

    emit OfferCreated(_tokenId, msg.sender, _price);
  }

  function cancelOffer(uint256 _tokenId) external {
    Offer storage offer = offers[_tokenId];
    require(offer.isForSale, 'Token not for sale');
    require(offer.seller == msg.sender, 'Not the seller');

    nftContract.safeTransferFrom(address(this), msg.sender, _tokenId);

    offer.isForSale = false;
    emit OfferCancelled(_tokenId);
  }

  function getOffer(uint256 _tokenId) external returns (Offer memory) {
    return offers[_tokenId];
  }

  function buyNFT(uint256 _tokenId) external nonReentrant {
    Offer storage offer = offers[_tokenId];
    require(offer.isForSale, 'Token not for sale');

    uint256 price = offer.price;
    acceptedToken.transferFrom(msg.sender, offer.seller, price);

    nftContract.safeTransferFrom(address(this), msg.sender, _tokenId);

    offer.isForSale = false;
    emit NFTSold(_tokenId, offer.seller, msg.sender, price);
  }
}
