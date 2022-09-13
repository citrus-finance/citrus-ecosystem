import { HardhatRuntimeEnvironment } from 'hardhat/types'

export async function getAllContractNames(hre: HardhatRuntimeEnvironment) {
  return Object.keys(await hre.deployments.all())
}

export async function getDeploymentContractName(
  hre: HardhatRuntimeEnvironment,
  deploymentName: string
): Promise<string> {
  const deployment = await hre.deployments.get(deploymentName)

  if (!deployment.metadata) {
    throw new Error('Deployment has no metadata')
  }

  const contractNames: string[] = Object.values(JSON.parse(deployment.metadata).settings.compilationTarget)

  if (contractNames.length !== 1) {
    throw new Error('Found more than one contract for deployment')
  }

  return contractNames[0]
}
