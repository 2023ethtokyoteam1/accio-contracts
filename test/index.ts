import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import {
  MockInterchainAccountRouter,
  MockInterchainAccountRouter__factory,
  LiquidityAggregator,
  LiquidityAggregator__factory,
  MockInterchainGasPaymaster,
  MockInterchainGasPaymaster__factory,
  IWETH9__factory,
  IWETH9,
  MockHypERC20__factory,
  MockHypERC20,
  SampleERC721,
  SampleERC721__factory,
  NFTMarket,
  NFTMarket__factory,
} from '../typechain';

describe('LiquidityAggregator', function () {
  const GOERLI_CHAIN_ID = 5;
  const MUMBAI_CHAIN_ID = 80001;
  const GOERLI_WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
  const MUMBAI_WRAPPED_WETH = '0xc6735cc74553Cc2caeB9F5e1Ea0A4dAe12ef4632';
  const GOERLI_RICH_ADDRESS = '0x20918f71e99C09aE2ac3E33DbDe33457d3be01f4';
  const GET_USER_TOKENS_FUNC_SELECTOR = ethers.utils
    .id('getUserTokens(uint32,address,uint256,address,uint256,uint256)')
    .substring(0, 10);
  const DUMMY_INTERCHAIN_ACCOUNT = ethers.Wallet.createRandom().address;
  const nftInfo = {
    nftContract: '',
    nftId: '',
  };
  const funds = [
    {
      chainId: GOERLI_CHAIN_ID,
      localWeth: '',
      localWethAmount: ethers.utils.parseEther('0.000005'),
    },
    {
      chainId: MUMBAI_CHAIN_ID,
      localWeth: '',
      localWethAmount: ethers.utils.parseEther('0.000005'),
    },
  ];

  let deployer: SignerWithAddress, buyer: SignerWithAddress, seller: SignerWithAddress, wethRich: SignerWithAddress;
  let laGoerli: LiquidityAggregator;
  let laMumbai: LiquidityAggregator;
  let icaRouter: MockInterchainAccountRouter;
  let gasPaymaster: MockInterchainGasPaymaster;
  let wethGoerli: IWETH9;
  let wethMumbai: MockHypERC20;
  let nft: SampleERC721;
  let nftMarket: NFTMarket;

  const addressToBytes32 = (address: string) => ethers.utils.hexZeroPad(ethers.utils.hexlify(address), 32);

  const impersonateAddress = (address: string) => {
    return ethers.getImpersonatedSigner(address);
  };

  beforeEach(async function () {
    [deployer, buyer, seller] = await ethers.getSigners();
    wethRich = await impersonateAddress(GOERLI_RICH_ADDRESS);

    icaRouter = await new MockInterchainAccountRouter__factory(deployer).deploy();
    await icaRouter.deployed();
    gasPaymaster = await new MockInterchainGasPaymaster__factory(deployer).deploy();
    await gasPaymaster.deployed();
    wethGoerli = IWETH9__factory.connect(GOERLI_WETH, deployer);
    await wethGoerli.deployed();
    wethMumbai = await new MockHypERC20__factory(deployer).deploy(); // because we're using the goerli fork
    await wethMumbai.deployed();
    await wethMumbai.connect(deployer).initialize(
      await wethGoerli.totalSupply(),
      'Wrapped ETH',
      'WETH'
    );

    nft = await new SampleERC721__factory(deployer).deploy();
    await nft.deployed();
    await nft.connect(deployer).safeMint(seller.address, '');
    nftInfo.nftContract = nft.address;
    nftInfo.nftId = '0';
    nftMarket = await new NFTMarket__factory(deployer).deploy(wethGoerli.address, nft.address);
    await nft.connect(seller).setApprovalForAll(nftMarket.address, true);
    await nftMarket.connect(seller).createOffer(nftInfo.nftId, ethers.utils.parseEther('0.00001'));

    laGoerli = await new LiquidityAggregator__factory(deployer).deploy(
      GOERLI_CHAIN_ID,
      icaRouter.address,
      gasPaymaster.address,
      wethGoerli.address,
      nftMarket.address,
    );
    await laGoerli.deployed();
    laMumbai = await new LiquidityAggregator__factory(deployer).deploy(
      MUMBAI_CHAIN_ID,
      icaRouter.address,
      gasPaymaster.address,
      wethMumbai.address,
      nftMarket.address,
    );
    await laMumbai.deployed();

    funds[0].localWeth = wethGoerli.address;
    funds[1].localWeth = wethMumbai.address;

    await deployer.sendTransaction({ to: laGoerli.address, value: ethers.utils.parseEther('10') });
    await deployer.sendTransaction({ to: laMumbai.address, value: ethers.utils.parseEther('10') });
    await wethGoerli.connect(wethRich).transfer(deployer.address, ethers.utils.parseEther('100'));
    await wethGoerli.connect(wethRich).transfer(buyer.address, ethers.utils.parseEther('100'));
    await wethGoerli.connect(wethRich).transfer(seller.address, ethers.utils.parseEther('100'));
    await wethMumbai.connect(deployer).transfer(buyer.address, ethers.utils.parseEther('100'));
    await wethMumbai.connect(deployer).transfer(seller.address, ethers.utils.parseEther('100'));
    await wethMumbai.connect(deployer).transfer(laMumbai.address, ethers.utils.parseEther('100'));
    await wethGoerli.connect(buyer).approve(laGoerli.address, ethers.constants.MaxUint256);
  });

  describe('setLiquidityAggregator', function () {
    it('should set a liquidity aggregator', async function () {
      await laGoerli.connect(deployer).setLiquidityAggregator(MUMBAI_CHAIN_ID, laMumbai.address);

      expect(await laGoerli.liquidityAggregators(MUMBAI_CHAIN_ID)).to.equal(laMumbai.address);
    });
  });

  describe('buy', function () {
    beforeEach(async function () {
      await laGoerli.connect(deployer).setLiquidityAggregator(MUMBAI_CHAIN_ID, laMumbai.address);
      await laMumbai.connect(deployer).setLiquidityAggregator(GOERLI_CHAIN_ID, laGoerli.address);
    });

    it('should add request info', async function () {
      const nextRequestId = await laGoerli.nextRequestId();
      await laGoerli.connect(buyer).buy(nftInfo, funds);

      // workaround for the auto conversion
      const expectedRequest: any = Object.values(nftInfo);
      expectedRequest[1] = BigNumber.from(nftInfo.nftId);
      expect(await laGoerli.requests(nextRequestId)).to.deep.equal([buyer.address, expectedRequest]);
      expect(await laGoerli.requestToFunds(nextRequestId, 0)).to.deep.equal([
        Object.values(funds[0]),
        ethers.BigNumber.from(0),
        true,
      ]);
      expect(await laGoerli.requestToFunds(nextRequestId, 1)).to.deep.equal([
        Object.values(funds[1]),
        ethers.BigNumber.from(1),
        false,
      ]);
      expect(await laGoerli.nextRequestId()).to.equal(nextRequestId.add(1));
    });

    it('should call dispatch on InterchainAccountRouter', async function () {
      const nextRequestId = await laGoerli.nextRequestId();
      await expect(laGoerli.connect(buyer).buy(nftInfo, funds))
        .to.emit(icaRouter, 'Dispatched')
        .withArgs(
          MUMBAI_CHAIN_ID,
          laMumbai.address,
          GET_USER_TOKENS_FUNC_SELECTOR,
          GOERLI_CHAIN_ID,
          funds[1].localWeth,
          funds[1].localWethAmount,
          buyer.address,
          nextRequestId,
          ethers.BigNumber.from(1),
        );
    });
  });

  describe('getUserTokens', function () {
    beforeEach(async function () {
      await laGoerli.connect(deployer).setLiquidityAggregator(MUMBAI_CHAIN_ID, laMumbai.address);
      await laMumbai.connect(deployer).setLiquidityAggregator(GOERLI_CHAIN_ID, laGoerli.address);

      await wethMumbai.connect(buyer).approve(laMumbai.address, ethers.constants.MaxUint256);
    });

    it('should burn user tokens on the remote chain', async function () {
      const userBalanceBefore = await wethMumbai.balanceOf(buyer.address);
      const totalSupplyBefore = await wethMumbai.totalSupply();

      const funcData = laGoerli.interface.encodeFunctionData(
        'handleWithTokens',
        [
          MUMBAI_CHAIN_ID,
          addressToBytes32(laMumbai.address),
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256'],
            [0, 1]
          ),
          funds[1].localWeth,
          funds[1].localWethAmount,
        ]
      );

      await expect(
        laMumbai.getUserTokens(
          GOERLI_CHAIN_ID,
          funds[1].localWeth,
          funds[1].localWethAmount,
          buyer.address,
          ethers.BigNumber.from(0),
          ethers.BigNumber.from(1),
        ),
      )
        .to.emit(wethMumbai, 'SentTransferRemote')
        .withArgs(
          GOERLI_CHAIN_ID,
          addressToBytes32(laGoerli.address),
          funds[1].localWethAmount,
          laGoerli.address,
          funcData,
          ethers.utils.parseEther('0.001'),
          laMumbai.address,
        );

      expect(await wethMumbai.balanceOf(buyer.address)).to.equal(userBalanceBefore.sub(funds[1].localWethAmount));
      expect(await wethMumbai.totalSupply()).to.equal(totalSupplyBefore.sub(funds[1].localWethAmount));
    });
  });

  describe('handleWithTokens', function () {
    let requestId: BigNumber;

    beforeEach(async function () {
      await laGoerli.connect(deployer).setLiquidityAggregator(MUMBAI_CHAIN_ID, laMumbai.address);
      // register a request
      requestId = await laGoerli.nextRequestId();
      await laGoerli.connect(buyer).buy(nftInfo, funds);
    });

    it("should update the fund's status to fulfilled", async function () {
      const receivedAmountBefore = await laGoerli.receivedAmounts(0);
      const message = ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256'], [0, 1]);
      const transferTx = await wethGoerli.connect(deployer).transfer(
        laGoerli.address,
        funds[1].localWethAmount
      );
      await transferTx.wait();
      await expect(
        laGoerli
          .connect(deployer)
          .handleWithTokens(
            MUMBAI_CHAIN_ID,
            addressToBytes32(DUMMY_INTERCHAIN_ACCOUNT),
            message,
            GOERLI_WETH,
            funds[1].localWethAmount,
          ),
      )
        .to.emit(laGoerli, 'FundFulfilled')
        .withArgs(
          requestId,
          MUMBAI_CHAIN_ID,
          addressToBytes32(DUMMY_INTERCHAIN_ACCOUNT),
          funds[1].localWeth,
          funds[1].localWethAmount,
          ethers.BigNumber.from(1),
          receivedAmountBefore.add(funds[1].localWethAmount),
          true,
        )
        .to.emit(nft, 'Transfer')
        .withArgs(laGoerli.address, buyer.address, nftInfo.nftId);

      expect(await laGoerli.receivedAmounts(0)).to.be.equal(receivedAmountBefore.add(funds[1].localWethAmount));
      expect(await laGoerli.requestToFunds(requestId, 0)).to.deep.equal([
        Object.values(funds[0]),
        ethers.BigNumber.from(0),
        true,
      ]);
      expect(await laGoerli.requestToFunds(requestId, 1)).to.deep.equal([
        Object.values(funds[1]),
        ethers.BigNumber.from(1),
        true, // changed
      ]);

      expect(await nft.balanceOf(laGoerli.address)).to.equal(0);
      expect(await nft.balanceOf(buyer.address)).to.equal(1);
      expect(await nft.ownerOf(nftInfo.nftId)).to.equal(buyer.address);
    });
  });
});
