import { writeFileSync, rmSync } from 'fs';
import { HardhatUserConfig, task } from 'hardhat/config';
import {
  LiquidityAggregator__factory,
  SampleERC721__factory,
  NFTMarket__factory,
  MockWethToken__factory,
  HypERC20Collateral__factory,
} from '../typechain';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import deployedContracts from './deployed_contracts.json';

const CHAIN_ID = '59140';

task('setup-linea', 'Deploy contracts on Linea').setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const [deployer, buyer, seller] = await hre.ethers.getSigners();

  // // deploy WETH
  // const weth = await new MockWethToken__factory(deployer).deploy();
  // await weth.deployed();
  // console.log('WETH deployed to: ', weth.address);
  // if (!(deployedContracts as any).linea) (deployedContracts as any).linea = {};
  // (deployedContracts as any).linea.weth = weth.address;

  // // deploy HypWETHCollateral
  // const hypWethCollateral = await new HypERC20Collateral__factory(deployer).deploy(weth.address);
  // await hypWethCollateral.deployed();
  // console.log('HypWETHCollateral deployed to:', hypWethCollateral.address);
  // (deployedContracts as any).mumbai.hyp_weth_collateral = hypWethCollateral.address;

  // approve HypWETHCollateral to use weth
  const weth = MockWethToken__factory.connect(deployedContracts.linea.weth, deployer);
  const hypWethCollateral = HypERC20Collateral__factory.connect(deployedContracts.linea.hyp_weth_collateral, deployer);
  const approveTx = await weth.approve(hypWethCollateral.address, hre.ethers.constants.MaxUint256);
  await approveTx.wait();
  console.log(
    'deployer approved HypWETHCollateral to use their weth. Amount: ',
    await weth.allowance(deployer.address, hypWethCollateral.address),
  );

  // deploy SampleERC721
  const erc721 = await new SampleERC721__factory(deployer).deploy();
  await erc721.deployed();
  console.log('SampleERC721 deployed to: ', erc721.address);
  (deployedContracts as any).linea.nft = erc721.address;

  // mint 1 NFTs
  for (let i = 0; i < 1; i++) {
    const tx = await SampleERC721__factory.connect(erc721.address, deployer).safeMint(deployer.address, 'test', {
      gasLimit: 1_000_000,
    });
    await tx.wait();
    console.log('Minted NFT: ', i);
  }

  // deploy NFTMarket
  const nftMarket = await new NFTMarket__factory(deployer).deploy(weth.address, erc721.address);
  await nftMarket.deployed();
  console.log('NFTMarket deployed to: ', nftMarket.address);
  (deployedContracts as any).linea.nft_market = nftMarket.address;

  // approve all SampleERC721 for NFTMarket
  const approveAllTx = await erc721.setApprovalForAll(nftMarket.address, true);
  await approveAllTx.wait();
  console.log('approve for all tx: ', approveAllTx.hash);
  console.log('approved for all: ', await erc721.isApprovedForAll(deployer.address, nftMarket.address));

  // create offer
  const createOfferTx = await nftMarket.createOffer(0, 1_000_000_000_000, {
    gasLimit: 1_000_000,
  });
  await createOfferTx.wait();
  console.log('createOfferTx: ', createOfferTx.hash);
  console.log('offer: ', await NFTMarket__factory.connect(nftMarket.address, deployer).getOffer(0));
  console.log(`owner of 0: `, await erc721.ownerOf(0));

  // deploy liquidity aggregator
  const liquidityAggregator = await new LiquidityAggregator__factory(deployer).deploy(
    CHAIN_ID,
    deployedContracts.linea.mailbox,
    deployedContracts.linea.gasPaymaster,
    weth.address,
    nftMarket.address,
  );
  await liquidityAggregator.deployed();
  console.log('deployed LA: ', liquidityAggregator.address);
  (deployedContracts as any).linea.liquidity_aggregator = liquidityAggregator.address;

  // send LINEA GOERLI to liquidity aggregator
  await deployer.sendTransaction({
    to: liquidityAggregator.address,
    value: hre.ethers.utils.parseEther('0.01'),
    gasLimit: 200000,
  });

  // Approve liquidity aggregator to use weth
  const approveLiquidityAggregatorTx = await weth.approve(liquidityAggregator.address, hre.ethers.constants.MaxUint256);
  await approveLiquidityAggregatorTx.wait();
  console.log(
    'deployer approved liquidity aggregator to use their weth. Amount: ',
    await weth.allowance(deployer.address, liquidityAggregator.address),
  );

  writeFileSync('./tasks/deployed_contracts.json', JSON.stringify(deployedContracts, null, 2), 'utf-8');
});
