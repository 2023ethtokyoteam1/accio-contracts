import { writeFileSync } from 'fs';
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

const LINEA_CHAIN_ID = '59140';
const MUMBAI_CHAIN_ID = '80001';

task('execute-buy', 'Execute buy function').setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const [deployer] = await hre.ethers.getSigners();
  const nftInfo = { nftContract: deployedContracts.linea.nft, nftId: 0 };
  const funds = [
    {
      chainId: LINEA_CHAIN_ID,
      localWeth: deployedContracts.linea.weth,
      localWethAmount: hre.ethers.utils.parseEther('0.5'),
    },
    {
      chainId: MUMBAI_CHAIN_ID,
      localWeth: deployedContracts.mumbai.hyp_weth,
      localWethAmount: hre.ethers.utils.parseEther('0.5'),
    },
  ];
  const lineaLAAddress = (deployedContracts as any).linea.liquidity_aggregator;
  const liquidityAggregator = LiquidityAggregator__factory.connect(lineaLAAddress, deployer);

  const tx = await liquidityAggregator.connect(deployer).buy(nftInfo, funds);
  await tx.wait();
  console.log('execute buy: ', tx.hash);
});
