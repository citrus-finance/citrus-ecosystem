import { getAllContractNames } from './deployment'

async function verifyContract(deploymentName: string) {
  const deployment = await hre.deployments.get(deploymentName)

  try {
    await hre.run('verify:verify', {
      address: deployment.address,
      constructorArguments: deployment.args,
    })
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('already verified')) {
      console.log(err.message)
      return
    }

    throw err
  }
}

export async function verifyAllContracts(_taskArguments, hre) {
  const deployments = await getAllContractNames(hre)

  for (let i = 0; i < deployments.length; i++) {
    const deploymentName = deployments[i]
    console.log('verifiying', deploymentName)

    await verifyContract(deploymentName)
  }
}
