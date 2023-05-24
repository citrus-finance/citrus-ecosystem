import hardhat from 'hardhat'

interface BaseVault {
  asset: string
  name: string
  symbol: string
  iconUrl: string
  maxCollateralRatio: number
  targetCollateralRatio: number
  withdrawalFee: number
  harvestFee: number
}

interface MockVault extends BaseVault {
  type: 'mock'
}

interface Aave2LeveragedVault extends BaseVault {
  type: 'aave-v2-leveraged'
  lendingPool: string
  incentivesController: string
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
    vaults: (Aave2LeveragedVault | MockVault)[]
  }
  oracle: {
    tokens: {
      symbol: string
      address: string
      type: 'chainlink' | 'none'
      base: 'USD'
      aggregator: string
    }[]
  }
}

// TODO: check all addresses are checksummed
export default function getConfig(): Config {
  if (hardhat.network.name === 'localhost' || hardhat.network.name === 'hardhat') {
    return require('../config/dev.json')
  }

  return require(`../config/${hardhat.network.name}.json`)
}
