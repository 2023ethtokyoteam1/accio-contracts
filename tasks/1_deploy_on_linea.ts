import { writeFileSync, rmSync } from 'fs';
import { BigNumber } from 'ethers';
import { HardhatUserConfig, task } from 'hardhat/config';
import {
  TestTokenRecipient__factory,
  IERC20__factory,
  ILiquidityLayerRouter__factory,
  IInterchainGasPaymaster__factory,
  LiquidityAggregator__factory,
  SeaportInterface__factory,
  GasRouter__factory,
  SampleERC721__factory,
  NFTMarket__factory,
  MockWethToken__factory,
  HypERC20Collateral__factory,
} from '../typechain';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import deployedContracts from './deployed_contracts.json';

const CHAIN_ID = '59140';
// {
//   "lineagoerli": {
//     "validatorAnnounce": "0x36209223151Ae50E043870c15524A7F407C467aC",
//     "proxyAdmin": "0xE18362185fc352E2048315671B5a056755AC867B",
//     "mailbox": "0x347c7237447d9c54E07d52AD004773B43735F87d",
//     "multisigIsm": "0x28AF628d0A73Bb4E1Ed01062361209a67e4600a7",
//     "testRecipient": "0xAF7BAedFc11802C52c7d4C28e4b0556293493C66",
//     "storageGasOracle": "0xDb2C625EC19cf67652d8b3D4B8Cbc00e001F19D9",
//     "interchainGasPaymaster": "0xd2Aa0Bb64e3E6Da4248aB7E611439E3C88Cf3398",
//     "defaultIsmInterchainGasPaymaster": "0x0234B02b63BEcA60A655F05DF68D263F56A59925"
//   },
//   "mumbai": {
//     "multisigIsm": "0x6Ba6a2bAB974a3Db8676732EA6F0A081c12E5449",
//     "testRecipient": "0x9Bb254510a02841393CF2dF864d8cC9679EC462E",
//     "proxyAdmin": "0xAF7aF50218d8EEBbf6e98618587815c51826b5F6",
//     "storageGasOracle": "0x7B8e8C5b33525194dF967b9608B2950b27BFb8f5",
//     "interchainGasPaymaster": "0x5487438FcCfc6b7f4C323bA2ACa4e0e34Fb5109b",
//     "defaultIsmInterchainGasPaymaster": "0x64bF2da16B855B8E24e1d26553E8AEE8bf9BCD8d"
//   }
// }

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

// hyperlane warp route deploy

// task('approve-erc721', 'Approves ERC721 contract')
//   .addParam('operator', 'Address of the operator')
//   .addParam('contract', 'Address of the ERC721 contract')
//   .setAction(async (taskArgs, hre) => {
//     const deployer = (await hre.ethers.getSigners())[0];
//     console.log('taskArgs.operator: ', taskArgs.operator);
//     console.log('taskArgs.contract: ', taskArgs.contract);
//   });

// task('create-offer', 'Creates an offer')
//   .addParam('nftmarket', 'Address of the NFTMarket contract')
//   .addParam('erc721', 'Address of the NFTMarket contract')
//   .addParam('tokenid', 'Token ID of the NFT')
//   .addParam('price', 'Price of the NFT')
//   .setAction(async (taskArgs, hre) => {
//     const deployer = (await hre.ethers.getSigners())[0];
//     const nftMarket = NFTMarket__factory.connect(taskArgs.nftmarket, deployer);
//     const tx = await nftMarket.createOffer(taskArgs.tokenid, hre.ethers.utils.parseEther(taskArgs.price), {
//       gasLimit: 1_000_000,
//     });
//     await tx.wait();
//     console.log('createOffer tx: ', tx);
//     console.log('offer: ', nftMarket.getOffer(taskArgs.tokenid));
//     const erc721 = SampleERC721__factory.connect(taskArgs.erc721, deployer);
//     console.log(`owner of ${taskArgs.tokenid}: `, await erc721.ownerOf(taskArgs.tokenid));
//   });
