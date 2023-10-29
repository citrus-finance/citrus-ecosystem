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

interface Aave2LeveragedVault extends BaseVault {
  type: 'aave-v2-leveraged'
  maxCollateralRatio: number
  targetCollateralRatio: number
  lendingPool: string
  incentivesController: string
}

interface Aave2ERC4626LeveragedVault extends Omit<Aave2LeveragedVault, 'type'> {
  type: 'aave-v2-erc4626-leveraged'
  vault: string
}

interface Aave2Vault extends BaseVault {
  type: 'aave-v2'
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
    vaults: (Aave2LeveragedVault | MockVault | Aave2Vault | Aave2ERC4626LeveragedVault)[]
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
