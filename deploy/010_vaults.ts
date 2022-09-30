import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import getConfig from '../utils/getConfig'
import deploy from '../utils/deploy'
import getTokenAddress from '../utils/getTokenAddress'
import writeOutput from '../utils/writeOutput'
import view from '../utils/view'
import execute from '../utils/execute'

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

  writeOutput('vault.harverters', {
    balancerManager: balancerPoolManagerDeployment.address,
    swapper: swapperDeployment.address,
  })

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
