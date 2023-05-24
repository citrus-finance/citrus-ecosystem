// Inspired by https://github.com/OriginProtocol/origin-dollar/blob/master/contracts/tasks/storageSlots.js
import { promises } from 'fs'

import path from 'path'

import {
  assertStorageUpgradeSafe,
  getStorageLayout,
  getVersion,
  getUnlinkedBytecode,
  isCurrentValidationData,
} from '@openzeppelin/upgrades-core'
import { getAllContractNames, getDeploymentContractName } from './deployment'
import { ValidationsCacheNotFound, ValidationsCacheOutdated } from '@openzeppelin/hardhat-upgrades/dist/utils'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export async function assertStorageLayoutChangeSafeForAll(_taskArguments: string, hre: HardhatRuntimeEnvironment) {
  const allContracts = await getAllContractNames(hre)

  for (let i = 0; i < allContracts.length; i++) {
    await assertUpgradeIsSafe(hre, await getDeploymentContractName(hre, allContracts[i]), allContracts[i])
  }
}

export async function assertUpgradeIsSafe(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  deploymentName: string
) {
  console.log(`Checking if contract ${deploymentName} is safe for upgrade`)

  const layout = await getStorageLayoutForContract(hre, contractName)
  const oldLayout = await loadPreviousStorageLayoutForContract(hre, deploymentName)

  if (!oldLayout) {
    console.debug(
      `Previous storage layout for ${deploymentName} not found. Treating ${deploymentName} as a new contract.`
    )
  } else {
    // 3rd param is opts.unsafeAllowCustomTypes
    assertStorageUpgradeSafe(oldLayout, layout, true)
    console.log(`Contract ${deploymentName} is safe for upgrade`)
  }
}

export async function assertSafeProxy(
  hre: HardhatRuntimeEnvironment,
  proxyContractName: string,
  implementationContractName: string
) {
  const proxyLayout = await getStorageLayoutForContract(hre, proxyContractName)
  const implementationLayout = await getStorageLayoutForContract(hre, implementationContractName)

  assertStorageUpgradeSafe(proxyLayout, implementationLayout, false)
}

async function getStorageLayoutForContract(hre: HardhatRuntimeEnvironment, contractName: string) {
  const validations = await readValidations(hre)
  const implFactory = await hre.ethers.getContractFactory(contractName)
  const unlinkedBytecode = getUnlinkedBytecode(validations, implFactory.bytecode)
  const version = getVersion(unlinkedBytecode, implFactory.bytecode)

  return getStorageLayout(validations, version)
}

async function loadPreviousStorageLayoutForContract(hre: HardhatRuntimeEnvironment, contractName: string) {
  const deployment = await hre.deployments.getOrNull(contractName)

  if (!deployment) {
    return null
  }

  return deployment.storageLayout
}

async function readValidations(hre: HardhatRuntimeEnvironment) {
  const cachePath = getValidationsCachePath(hre)
  try {
    const data = JSON.parse(await promises.readFile(cachePath, 'utf8'))
    if (!isCurrentValidationData(data)) {
      await promises.unlink(cachePath)
      throw new ValidationsCacheOutdated()
    }
    return data
  } catch (e) {
    // @ts-ignore
    if (e.code === 'ENOENT') {
      throw new ValidationsCacheNotFound()
    } else {
      throw e
    }
  }
}

function getValidationsCachePath(hre: HardhatRuntimeEnvironment) {
  return path.join(hre.config.paths.cache, 'validations.json')
}
