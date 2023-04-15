import { writeFileSync, rmSync } from 'fs';
import { HardhatUserConfig, task } from 'hardhat/config';
import { SampleERC721__factory, NFTMarket__factory, MockWethToken__factory } from '../typechain';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import deployedContracts from './deployed_contracts.json';

const CHAIN_ID = '59140';

task('create-offers', 'Deploy contracts on Linea').setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const [deployer, buyer, seller] = await hre.ethers.getSigners();

  const weth = MockWethToken__factory.connect(deployedContracts.linea.weth, deployer);
  const erc721 = SampleERC721__factory.connect(deployedContracts.linea.nft, deployer);
  const nftMarket = NFTMarket__factory.connect(deployedContracts.linea.nft_market, deployer);

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
