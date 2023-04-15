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

task('create-offers', 'Deploy contracts on Linea').setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const [deployer, buyer, seller] = await hre.ethers.getSigners();

  const weth = MockWethToken__factory.connect(deployedContracts.linea.weth, deployer);
  const erc721 = SampleERC721__factory.connect(deployedContracts.linea.nft, deployer);
  const nftMarket = NFTMarket__factory.connect(deployedContracts.linea.nft_market, deployer);

  //   // mint NFTs
  //   for (let i = 1; i < 10; i++) {
  //     const tx = await SampleERC721__factory.connect(erc721.address, deployer).safeMint(deployer.address, 'test', {
  //       gasLimit: 1_000_000,
  //     });
  //     await tx.wait();
  //     console.log('Minted NFT: ', i);
  //   }

  //   // approve all SampleERC721 for NFTMarket
  //   const approveAllTx = await erc721.setApprovalForAll(nftMarket.address, true);
  //   await approveAllTx.wait();
  //   console.log('approve for all tx: ', approveAllTx.hash);
  //   console.log('approved for all: ', await erc721.isApprovedForAll(deployer.address, nftMarket.address));

  // create offer
  for (let i = 0; i < 10; i++) {
    const createOfferTx = await nftMarket.createOffer(i, hre.ethers.utils.parseEther('1'), {
      gasLimit: 1_000_000,
    });
    await createOfferTx.wait();
    console.log('createOfferTx: ', createOfferTx.hash);
    console.log(`offer of ${i}: `, await nftMarket.getOffer(i));
    console.log(`owner of ${i}: `, await erc721.ownerOf(i));
  }

  writeFileSync('./tasks/deployed_contracts.json', JSON.stringify(deployedContracts, null, 2), 'utf-8');
});
