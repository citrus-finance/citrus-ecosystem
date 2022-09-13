import { deployments } from 'hardhat'

import { ethers } from 'ethers'

import { isTestnet } from './env'
import getConfig from './getConfig'

export default async function getTokenAddress(addressOrname: string) {
  if (ethers.utils.isAddress(addressOrname)) {
    return addressOrname
  }

  const config = getConfig()

  const token = config.tokens[addressOrname]

  if (typeof token === 'string') {
    if (token === 'WETH') {
      if (!isTestnet) {
        throw new Error('Cannot use mock token outside of testnet')
      }

      const d = await deployments.get('WETH')
      return d.address
    }

    return token
  }

  if (!isTestnet) {
    throw new Error('Cannot use mock token outside of testnet')
  }

  const d = await deployments.get(token.symbol)
  return d.address
}
