import addProposal from './addProposal'
import getEthers from './getEthers'

const { deployments, getUnnamedAccounts } = require('hardhat')
const { isLocalhost } = require('./env')

export default async function execute(
  addressOrname: string,
  contractName: string,
  methodName: string,
  args: any[] = [],
  forceProposal: boolean = false
) {
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

  const admin: string = await Promise.resolve()
    .then(() => contract.admin())
    .catch(() => {
      return contract.owner()
    })
    .catch(() => {
      // if the contract doesn't have an admin/owner, the deployer can run all the method
      return deployer
    })

  if (!forceProposal && admin === deployer) {
    console.log(`running ${contractName}#${methodName}`)
    const tx = await contract[methodName](...args)
    if (!isLocalhost) {
      await tx.wait(2)
    }
    return
  }

  console.log(`scheduling ${contractName}#${methodName} for proposal`)
  addProposal(contract.address, contractName, methodName, args)
}
