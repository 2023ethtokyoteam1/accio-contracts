// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

import {ILiquidityLayerMessageRecipient} from "./hyperlane/interfaces/ILiquidityLayerMessageRecipient.sol";
import {IInterchainAccountRouter} from "./hyperlane/interfaces/IInterchainAccountRouter.sol";
import {ILiquidityLayerRouter} from "./hyperlane/interfaces/ILiquidityLayerRouter.sol";
import {IInterchainGasPaymaster} from "./hyperlane/interfaces/IInterchainGasPaymaster.sol";
import {HypERC20} from "./hyperlane/HypERC20.sol";
import {NFTMarket} from "./linea/NFTMarket.sol";

import {ILiquidityAggregator} from "./interfaces/ILiquidityAggregator.sol";

contract LiquidityAggregator is
    ILiquidityAggregator,
    ILiquidityLayerMessageRecipient,
    Ownable,
    IERC721Receiver,
    IERC1155Receiver,
    ERC165
{
    error RequestAlreadyFulfilled(uint256 requestId);

    event BuyMessageDispatched(uint256 indexed requestId, uint32 indexed destinationChainId, bytes32 messageId);
    event DispatchWithTokensMessageDispatched(
        uint256 indexed requestId, uint32 indexed localChainId, bytes32 messageId
    );
    event FundFulfilled(
        uint256 indexed requestId,
        uint32 indexed remoteChainId,
        bytes32 sender,
        address token,
        uint256 amount,
        uint256 fundIndex,
        uint256 receivedAmount,
        bool allFulfilled
    );

    uint32 public immutable chainId;
    address public immutable icaRouter; // InterchainAccountRouter
    address public immutable gasPaymaster; // InterchainGasPaymaster
    address public immutable deployedChainWeth;
    mapping(uint32 => address) public liquidityAggregators; // chainId => liquidityAggregator
    mapping(uint256 => Request) public requests;
    mapping(uint256 => FundWithStatus[]) public requestToFunds;
    mapping(uint256 => uint256) public receivedAmounts; // requestId => receivedAmount
    uint256 public nextRequestId;

    uint256 private constant ACCOUNT_API_CALL_GAS_AMOUNT = 450000; // Goerli -> Mumbai
    uint256 private constant LIQUIDITY_API_CALL_GAS_AMOUNT = 500000; // Mumbai -> Goerli

    NFTMarket immutable nftMarket;

    constructor(
        uint32 _chainId,
        address _icaRouter,
        address _gasPaymaster,
        address _deployedChainWeth,
        NFTMarket _nftMarket
    ) Ownable() {
        chainId = _chainId;
        icaRouter = _icaRouter; // unique to the current chain
        gasPaymaster = _gasPaymaster; // unique to the current chain
        deployedChainWeth = _deployedChainWeth;
        nftMarket = _nftMarket;

        IERC20 paymentToken = nftMarket.acceptedToken();
        paymentToken.approve(address(nftMarket), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
    }

    function setLiquidityAggregator(uint32 _chainId, address _liquidityAggregator) external onlyOwner {
        liquidityAggregators[_chainId] = _liquidityAggregator;
    }

    function buy(NftInfo calldata nftInfo, Fund[] calldata funds)
        external
        override(ILiquidityAggregator)
        returns (uint256)
    {
        uint256 requestId = nextRequestId;
        requests[requestId] = Request(msg.sender, nftInfo);
        nextRequestId += 1;

        for (uint256 i; i < funds.length; ++i) {
            // TODO: check if funds[i].chainId is supported
            require(funds[i].chainId != 0, "Invalid chain ID");
            require(funds[i].localWeth != address(0), "Invalid localWeth");
            require(funds[i].localWethAmount != 0, "Invalid localWethAmount");

            if (funds[i].chainId == chainId) {
                receivedAmounts[requestId] += funds[i].localWethAmount;
                requestToFunds[requestId].push(FundWithStatus(funds[i], i, true));
                IERC20(deployedChainWeth).transferFrom(msg.sender, address(this), funds[i].localWethAmount);
            } else {
                requestToFunds[requestId].push(FundWithStatus(funds[i], i, false));

                // NOTE: this contract becomes the *owner* of the remote chain account
                // NOTE: only works for EVM compatible chains
                bytes32 messageId = IInterchainAccountRouter(icaRouter).dispatch(
                    funds[i].chainId, // https://docs.hyperlane.xyz/docs/resources/domains
                    liquidityAggregators[funds[i].chainId], // liquidity aggregator on the remote chain
                    abi.encodeWithSelector(
                        ILiquidityAggregator.getUserTokens.selector,
                        chainId,
                        funds[i].localWeth,
                        funds[i].localWethAmount,
                        msg.sender,
                        requestId,
                        i
                    )
                );

                uint256 gasPayment =
                    IInterchainGasPaymaster(gasPaymaster).quoteGasPayment(funds[i].chainId, ACCOUNT_API_CALL_GAS_AMOUNT);
                IInterchainGasPaymaster(gasPaymaster).payForGas{value: gasPayment}(
                    messageId, funds[i].chainId, ACCOUNT_API_CALL_GAS_AMOUNT, address(this)
                );

                emit BuyMessageDispatched(requestId, funds[i].chainId, messageId);
            }
        }

        return requestId;
    }

    function getUserTokens(
        uint32 _remoteChainId,
        address _localWeth,
        uint256 _localWethAmount,
        address _userAddress,
        uint256 _requestId,
        uint256 _fundIndex
    ) external override(ILiquidityAggregator) /* onlyInterchainAccount */ {
        uint256 tokenAmount = _localWethAmount;
        IERC20(_localWeth).transferFrom(_userAddress, address(this), _localWethAmount);

        bytes memory data;
        {
            data = abi.encode(
                liquidityAggregators[_remoteChainId],
                abi.encodeWithSelector(
                    this.handleWithTokens.selector,
                    chainId,
                    bytes32(uint256(uint160(address(this)))),
                    abi.encode(_requestId, _fundIndex),
                    _localWeth,
                    _localWethAmount
                )
            );
        }

        uint256 gasPayment =
            IInterchainGasPaymaster(gasPaymaster).quoteGasPayment(_remoteChainId, LIQUIDITY_API_CALL_GAS_AMOUNT);

        bytes32 messageId = HypERC20(_localWeth).transferRemote{value: gasPayment}(
            _remoteChainId, bytes32(uint256(uint160(liquidityAggregators[_remoteChainId]))), tokenAmount, data
        );

        emit DispatchWithTokensMessageDispatched(_requestId, chainId, messageId);
    }

    function handleWithTokens(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message,
        address _localWeth,
        uint256 _amount
    ) external override(ILiquidityLayerMessageRecipient) /* TODO: onlyMailbox */ {
        (uint256 requestId, uint256 fundIndex) = abi.decode(_message, (uint256, uint256));
        FundWithStatus[] storage funds = requestToFunds[requestId];
        FundWithStatus storage fund = funds[fundIndex];
        fund.fulfilled = true;
        receivedAmounts[requestId] += _amount; // TODO: use the swapped amount if we used 1inch swap

        bool allFulfilled = true;
        for (uint256 i; i < funds.length; ++i) {
            FundWithStatus memory fws = funds[i];
            if (!fws.fulfilled) {
                allFulfilled = false;
            }
        }

        emit FundFulfilled(
            requestId, _origin, _sender, _localWeth, _amount, fundIndex, receivedAmounts[requestId], allFulfilled
        );

        if (allFulfilled) {
            Request memory request = requests[requestId];

            // Linea Sample Marketplace
            NFTMarket.Offer memory offer = nftMarket.getOffer(request.nftInfo.nftId);
            require(receivedAmounts[requestId] >= offer.price, "Insufficient funds");
            nftMarket.buyNFT(request.nftInfo.nftId);
            IERC721(request.nftInfo.nftContract).safeTransferFrom(address(this), request.sender, request.nftInfo.nftId);
        }
    }

    function approve(address _token, address _spender, uint256 _amount) external onlyOwner {
        bool success = IERC20(_token).approve(_spender, _amount);
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data)
        external
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId || interfaceId == type(IERC1155Receiver).interfaceId
            || super.supportsInterface(interfaceId);
    }

    receive() external payable {}

    fallback() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
