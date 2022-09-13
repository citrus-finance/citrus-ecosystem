import hardhat from 'hardhat'
import { HardhatEthersHelpers } from 'hardhat-deploy-ethers/types'

export default function getEthers(): typeof hardhat.ethers & HardhatEthersHelpers {
  // @ts-ignore
  return hardhat.ethers
}
