#!/bin/sh

# Deploy and setup commands


yarn hardhat compile \
&& yarn hardhat setup-linea --network linea \
&& yarn hardhat setup-mumbai --network mumbai \
&& yarn hardhat setup-linea-liquidity-aggregator --network linea \
&& yarn hardhat execute-buy --network linea \
