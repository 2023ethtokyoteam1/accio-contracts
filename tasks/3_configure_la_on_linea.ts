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

const MUMBAI_CHAIN_ID = '80001';

task('setup-linea-liquidity-aggregator', 'Set remote liquidity aggregator').setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();
    const mumbaiLAAddress = (deployedContracts as any).mumbai.liquidity_aggregator;
    const lineaLAAddress = (deployedContracts as any).linea.liquidity_aggregator;
    const liquidityAggregator = LiquidityAggregator__factory.connect(lineaLAAddress, deployer);
    const setTx = await liquidityAggregator.connect(deployer).setLiquidityAggregator(MUMBAI_CHAIN_ID, mumbaiLAAddress);
    await setTx.wait();
    console.log('set remote liquidity aggregator: ', await liquidityAggregator.liquidityAggregators(MUMBAI_CHAIN_ID));
  },
);

task('topup-mumbai-hypWETH', 'Call transferRemote on Linea to top up hypWETH on Mumbai').setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();
    const hypWethCollateralAddress = (deployedContracts as any).mumbai.hyp_weth_collateral;
    const hypWethCollateral = HypERC20Collateral__factory.connect(hypWethCollateralAddress, deployer);

    const gasPaymaster = IInterchainGasPaymaster__factory.connect(
      (deployedContracts as any).linea.gasPaymaster,
      deployer,
    );
    const gasPaymentQuote = await gasPaymaster.quoteGasPayment(MUMBAI_CHAIN_ID, 500000);

    console.log('gasPaymentQuote: ', gasPaymentQuote);
    // console.log('hre.ethers.utils.formatBytes32String(deployer.address): ', addressToBytes32(hre, deployer.address));
    // const weth = MockWethToken__factory.connect(deployedContracts.linea.weth, deployer);
    // console.log('weth: ', weth.address);
    // const approveTx = await weth.approve(hypWethCollateral.address, hre.ethers.constants.MaxUint256);
    // await approveTx.wait();
    // console.log(
    //   'deployer approved HypWETHCollateral to use their weth. Amount: ',
    //   await weth.allowance(deployer.address, hypWethCollateral.address),
    // );

    // console.log('weth address: ', await hypWethCollateral.wrappedToken());

    const transferTx = await hypWethCollateral
      .connect(deployer)
      .transferRemote(
        MUMBAI_CHAIN_ID,
        addressToBytes32(hre, deployer.address),
        hre.ethers.utils.parseEther('1'),
        '0x000x000000000000000000000000421ed2fb212ed93bc8e16538b0c870d2bd01791c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000041234567800000000000000000000000000000000000000000000000000000000',
        {
          value: gasPaymentQuote,
        },
      );
    await transferTx.wait();
    console.log('transferTx: ', transferTx.hash);
    console.log('transferred WETH to remote (Mumbai)');
  },
);

function addressToBytes32(hre: HardhatRuntimeEnvironment, address: string): string {
  return hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexStripZeros(address), 32).toLowerCase();
}
