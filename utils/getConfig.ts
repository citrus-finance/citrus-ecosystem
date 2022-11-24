import hardhat from 'hardhat'

interface BaseVault {
  asset: string
  name: string
  symbol: string
  iconUrl: string
  withdrawalFee: number
  harvestFee: number
}

interface MockVault extends BaseVault {
  type: 'mock'
}

export interface Aave2LeveragedVault extends BaseVault {
  type: 'aave-v2-leveraged'
  lendingPool: string
  incentivesController: string
  maxCollateralRatio: number
  targetCollateralRatio: number
}

export interface HopVault extends BaseVault {
  type: 'hop-vault'
  stakingRewards: string
}

interface Config {
  weth: string
  tokens: {
    [name: string]:
      | string
      | 'WETH'
      | {
          name: string
          symbol: string
          decimals: number
        }
  }
  vault: {
    manager: string
    feeTaker: string
    vaults: (Aave2LeveragedVault | MockVault | HopVault)[]
  }
}

// TODO: check all addresses are checksummed
export default function getConfig(): Config {
  if (hardhat.network.name === 'localhost' || hardhat.network.name === 'hardhat') {
    return require('../config/dev.json')
  }

  return require(`../config/${hardhat.network.name}.json`)
}
