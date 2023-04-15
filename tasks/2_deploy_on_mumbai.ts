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
  HypERC20__factory,
} from '../typechain';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import deployedContracts from './deployed_contracts.json';

const LINEA_CHAIN_ID = '59140';
const MUMBAI_CHAIN_ID = '80001';

task('setup-mumbai', 'Deploy contracts on Mumbai').setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const [deployer, buyer, seller] = await hre.ethers.getSigners();

  // // deploy hyperlane warp route
  // const hypWeth = await new HypERC20__factory(deployer).deploy();
  // await hypWeth.deployed();
  // console.log('HypWETH deployed to:', hypWeth.address);
  // if (!(deployedContracts as any).mumbai) (deployedContracts as any).mumbai = {};
  // (deployedContracts as any).mumbai.hyp_weth = hypWeth.address;

  // // initialize hypWETH
  // await hypWeth
  //   .connect(deployer)
  //   .initialize(MAILBOX, GAS_PAYMASTER, hre.ethers.utils.parseEther('1000000000'), 'Hyp Wrapped ETH', 'HypWETH');
  // console.log('initialized hypWETH');

  const hypWeth = HypERC20__factory.connect(deployedContracts.mumbai.hyp_weth, deployer);

  // deploy liquidity aggregator
  const liquidityAggregator = await new LiquidityAggregator__factory(deployer).deploy(
    MUMBAI_CHAIN_ID,
    hre.ethers.constants.AddressZero,
    deployedContracts.mumbai.gasPaymaster,
    hypWeth.address,
    hre.ethers.constants.AddressZero,
  );
  await liquidityAggregator.deployed();
  console.log('deployed LA: ', liquidityAggregator.address);
  (deployedContracts as any).mumbai.liquidity_aggregator = liquidityAggregator.address;

  // send MATIC to liquidity aggregator
  await deployer.sendTransaction({
    to: liquidityAggregator.address,
    value: hre.ethers.utils.parseEther('0.01'),
    gasLimit: 200000,
  });

  // set remote liquidity aggregator
  const setLiqAggTx = await liquidityAggregator
    .connect(deployer)
    .setLiquidityAggregator(LINEA_CHAIN_ID, (deployedContracts as any).linea.liquidity_aggregator);
  await setLiqAggTx.wait();
  console.log('set remote liquidity aggregator: ', setLiqAggTx.hash);

  // approve LA to use HypWETH
  const approveLAtx = await hypWeth
    .connect(deployer)
    .approve(liquidityAggregator.address, hre.ethers.constants.MaxUint256);
  await approveLAtx.wait();
  console.log('approved LA: ', approveLAtx.hash);

  // Set ISM
  const setISMtx = await liquidityAggregator
    .connect(deployer)
    .setInterchainSecurityModule(deployedContracts.mumbai.ism);
  await setISMtx.wait();
  console.log('set ISM: ', setISMtx.hash);

  writeFileSync('./tasks/deployed_contracts.json', JSON.stringify(deployedContracts, null, 2));
});
