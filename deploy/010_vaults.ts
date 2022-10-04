import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import getConfig from '../utils/getConfig'
import deploy from '../utils/deploy'
import getTokenAddress from '../utils/getTokenAddress'
import writeOutput from '../utils/writeOutput'
import view from '../utils/view'
import execute from '../utils/execute'
import { numberToMantissa } from '../utils/number'

const deployVaults: DeployFunction = async function deployVaults({}: HardhatRuntimeEnvironment) {
  const config = getConfig()

  // Deploy Lens
  const lensDeployment = await deploy('VaultLens', 'VaultLens', {
    args: [],
    // FIXME: remove once skipIfSameBytecode is fixed
    skipIfAlreadyDeployed: true,
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
  })

  writeOutput('vault.lens', lensDeployment.address)

  // Deploy Harvesters

  const swapperDeployment = await deploy('Swapper', 'Swapper', {
    args: [],
    // FIXME: remove once skipIfSameBytecode is fixed
    skipIfAlreadyDeployed: true,
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
  })

  const balancerPoolManagerDeployment = await deploy('BalancerPoolManager', 'BalancerPoolManager', {
    args: [],
    // FIXME: remove once skipIfSameBytecode is fixed
    skipIfAlreadyDeployed: true,
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
  })

  const harverters = {
    balancerManager: balancerPoolManagerDeployment.address,
    swapper: swapperDeployment.address,
  } as const

  writeOutput('vault.harverters', harverters)

  // Deploy Vaults
  for (let i = 0; i < config.vault.vaults.length; i++) {
    const vault = config.vault.vaults[i]

    const assetAddress = await getTokenAddress(vault.asset)

    const vaultDeployment = await (async () => {
      switch (vault.type) {
        case 'mock': {
          return deploy(vault.name.replaceAll(' ', ''), 'MockERC4626', {
            args: [assetAddress, vault.name, vault.symbol],
            skipIfAlreadyDeployed: true,
            skipUpgradeSafety: true,
          })
        }

        case 'aave-v2-leveraged': {
          return deploy(vault.name.replaceAll(' ', ''), 'Aave2LeveragedVault', {
            args: [assetAddress, vault.name, vault.symbol, vault.lendingPool, vault.incentivesController],
            skipIfAlreadyDeployed: true,
            skipUpgradeSafety: true,
          })
        }
      }
    })()

    const hasManager = !['mock'].includes(vault.type)
    if (hasManager) {
      const actualManager = await view(vaultDeployment.address, 'LeveragedLendingVault', 'manager')
      const expectedManager = config.vault.manager

      if (actualManager !== expectedManager) {
        await execute(vaultDeployment.address, 'LeveragedLendingVault', 'setManager', [expectedManager])
      }

      const actualWithdrawalFee = await view(vaultDeployment.address, 'LeveragedLendingVault', 'withdrawalFee')
      const expectedWithdrawalFee = numberToMantissa(vault.withdrawalFee)

      if (!actualWithdrawalFee.eq(expectedWithdrawalFee)) {
        await execute(vaultDeployment.address, 'LeveragedLendingVault', 'setWithdrawalFee', [expectedWithdrawalFee])
      }

      const actualHarvestFee = await view(vaultDeployment.address, 'LeveragedLendingVault', 'harvestFee')
      const expectedHarvestFee = numberToMantissa(vault.harvestFee)

      if (!actualHarvestFee.eq(expectedHarvestFee)) {
        await execute(vaultDeployment.address, 'LeveragedLendingVault', 'setHarvestFee', [expectedHarvestFee])
      }
    }

    const isHarvestable = !['mock'].includes(vault.type)
    if (isHarvestable) {
      const actualHarvesters = (
        await view(vaultDeployment.address, 'LeveragedLendingVault', 'allHarvesters').then((arr: string[]) =>
          Promise.all(
            arr.map(async (x) => [
              x,
              await view(vaultDeployment.address, 'LeveragedLendingVault', 'allowedHarvesters', [x]),
            ])
          )
        )
      )
        .filter((x) => x[1])
        .map((x) => x[0])
      const expectedHarvesters = [harverters.balancerManager, harverters.swapper]

      const harvertersToAdd = expectedHarvesters.filter((x) => !actualHarvesters.includes(x))
      const harvertersToRemove = actualHarvesters.filter((x) => !expectedHarvesters.includes(x))

      await Promise.all(
        harvertersToAdd.map(async (harverter) => {
          await execute(vaultDeployment.address, 'LeveragedLendingVault', 'allowHarvester', [harverter, true])
        })
      )

      await Promise.all(
        harvertersToRemove.map(async (harverter) => {
          await execute(vaultDeployment.address, 'LeveragedLendingVault', 'allowHarvester', [harverter, false])
        })
      )

      const actualFeeTaker = await view(vaultDeployment.address, 'LeveragedLendingVault', 'feeTaker')
      const expectedFeeTaker = config.vault.feeTaker

      if (actualFeeTaker !== expectedFeeTaker) {
        await execute(vaultDeployment.address, 'LeveragedLendingVault', 'setFeeTaker', [expectedFeeTaker])
      }
    }

    const isLeveraged = ['aave-v2-leveraged'].includes(vault.type)
    if (isLeveraged) {
      const actualMaxCollateralRatio = await view(
        vaultDeployment.address,
        'LeveragedLendingVault',
        'maxCollateralRatio'
      )
      const expectedMaxCollateralRatio = numberToMantissa(vault.maxCollateralRatio)

      if (!actualMaxCollateralRatio.eq(expectedMaxCollateralRatio)) {
        await execute(vaultDeployment.address, 'LeveragedLendingVault', 'setMaxCollateralRatio', [
          expectedMaxCollateralRatio,
        ])
      }

      const actualTargetCollateralRatio = await view(
        vaultDeployment.address,
        'LeveragedLendingVault',
        'targetCollateralRatio'
      )
      const expectedTargetCollateralRatio = numberToMantissa(vault.targetCollateralRatio)

      if (!actualTargetCollateralRatio.eq(expectedTargetCollateralRatio)) {
        await execute(vaultDeployment.address, 'LeveragedLendingVault', 'setTargetCollateralRatio', [
          expectedTargetCollateralRatio,
        ])
      }
    }

    writeOutput(`vault.vaults[${i}]`, {
      address: vaultDeployment.address,
      name: vault.name,
      asset: {
        name: await view(assetAddress, 'IStrictERC20', 'name'),
        symbol: await view(assetAddress, 'IStrictERC20', 'symbol'),
        iconUrl: vault.iconUrl,
        isWrappedNative: assetAddress.toLowerCase() === (await getTokenAddress(config.weth)).toLowerCase(),
      },
      withdrawalFeePercentage: vault.withdrawalFee * 100,
      harvestFeePercentage: vault.harvestFee * 100,
    })
  }
}

export default deployVaults
deployVaults.id = '010_vaults'
deployVaults.tags = []
