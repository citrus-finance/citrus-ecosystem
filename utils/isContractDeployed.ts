import { getUnnamedAccounts } from 'hardhat'
import getEthers from './getEthers'

export default async function isContractDeployed(address: string): Promise<boolean> {
  const ethers = getEthers()
  const [deployer] = await getUnnamedAccounts()

  const code = await ethers.provider.getCode(address)

  return code !== '0x'
}
