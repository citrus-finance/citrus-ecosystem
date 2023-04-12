import hardhat, { deployments, getUnnamedAccounts } from 'hardhat'
import { DeployResult } from 'hardhat-deploy/types'
import { isLocalhost } from './env'
import { assertUpgradeIsSafe } from './storageLayout'

export default async function deploy(
  name: string,
  contractName: string,
  options: {
    args?: any[]
    skipUpgradeSafety?: boolean
    skipIfSameBytecode?: boolean
    skipIfAlreadyDeployed?: boolean
  }
): Promise<DeployResult> {
  const { deploy } = deployments
  const [deployer] = await getUnnamedAccounts()

  if (!options.skipUpgradeSafety) {
    await assertUpgradeIsSafe(hardhat, contractName, name)
  }

  if (options.skipIfSameBytecode) {
    const deployedContract = await deployments.getOrNull(name)

    if (deployedContract) {
      const artifact = await deployments.getArtifact(contractName)

      if (deployedContract.bytecode === artifact.bytecode) {
        console.log(`Reusing "${name}" at ${deployedContract.address}`)

        return {
          ...deployedContract,
          newlyDeployed: false,
        }
      }
    }
  }

  const result = await deploy(name, {
    contract: contractName,
    from: deployer,
    waitConfirmations: isLocalhost ? 0 : 1,
    log: true,
    args: options.args,
    skipIfAlreadyDeployed: options.skipIfAlreadyDeployed,
  })

  return result
}
