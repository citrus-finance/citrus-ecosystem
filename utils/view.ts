import { deployments, getUnnamedAccounts } from 'hardhat'
import getEthers from './getEthers'

export default async function view(addressOrname: string, contractName: string, methodName: string, args: any[] = []) {
  const ethers = getEthers()
  const [deployer] = await getUnnamedAccounts()

  const contract = await (async () => {
    if (ethers.utils.isAddress(addressOrname)) {
      return ethers.getContractAt(contractName, addressOrname, deployer)
    } else {
      const deployment = await deployments.get(addressOrname)
      return ethers.getContractAt(contractName, deployment.address, deployer)
    }
  })()

  return contract[methodName](...args)
}
