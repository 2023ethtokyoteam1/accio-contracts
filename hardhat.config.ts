import * as dotenv from 'dotenv';

import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import { LiquidityAggregator__factory } from './typechain';
import './tasks/1_deploy_on_linea';
import './tasks/2_deploy_on_mumbai';
import './tasks/3_configure_la_on_linea';
import './tasks/4_execute_buy_on_linea';
import './tasks/101_create_offers_on_linea';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task('withdraw-native-token', 'Withdraws native token from the given contract')
  .addParam('address', 'Address of the contract')
  .setAction(async (taskArgs, hre) => {
    const deployer = (await hre.ethers.getSigners())[0];
    const liquidityAggregator = LiquidityAggregator__factory.connect(taskArgs.address, deployer);
    await liquidityAggregator.withdraw();
  });

task('send-native-token-to-contract', 'Sends native token to the given contract')
  .addParam('address', 'Address of the contract')
  .addParam('amount', 'Amount of native token to send')
  .setAction(async (taskArgs, hre) => {
    const deployer = (await hre.ethers.getSigners())[0];
    await deployer.sendTransaction({
      to: taskArgs.address,
      value: hre.ethers.utils.parseEther(taskArgs.amount),
      gasLimit: 200000,
    });
  });

const config: HardhatUserConfig = {
  solidity: '0.8.19',
  networks: {
    hardhat: {
      forking: {
        // url: process.env.MUMBAI_URL || '',
        url: process.env.GOERLI_URL || '',
        // url: process.env.ETH_URL || '',
        // url: process.env.LINEA_URL || '',
        // blockNumber: 34000674, // mumbai
        blockNumber: 8739350, // goerli
        // blockNumber: 16925225, // eth mainnet
        // blockNumber: 452839 // linea
      },
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.BUYER_KEY !== undefined &&
        process.env.SELLER_KEY !== undefined
          ? [
              {
                privateKey: process.env.PRIVATE_KEY,
                balance: '1000000000000000000000',
              },
              {
                privateKey: process.env.BUYER_KEY,
                balance: '1000000000000000000000',
              },
              {
                privateKey: process.env.SELLER_KEY,
                balance: '1000000000000000000000',
              },
            ]
          : [],
      // chainId: 80001, // mumbai
      chainId: 5, // goerli
      // chainId: 59140, // linea
    },
    goerli: {
      url: process.env.GOERLI_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.MUMBAI_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    linea: {
      url: process.env.LINEA_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    // apiKey: process.env.POLYGONSCAN_API_KEY,
  },
};

export default config;
