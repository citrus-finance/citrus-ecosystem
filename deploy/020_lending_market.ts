import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployments } from 'hardhat'
import getTimelockAddress from '../utils/getTimelockAddress'
import { numberToMantissa } from '../utils/number'
import deploy from '../utils/deploy'
import writeAllOutput from '../utils/writeAllOutput'

const deployLendingMarket: DeployFunction = async function deployLendingMarket({}: HardhatRuntimeEnvironment) {
  const timelock = await getTimelockAddress()

  const comptrollerContract = await deploy('Comptroller', 'contracts/rari-fuse/src/core/Comptroller.sol:Comptroller', {
    deterministicDeployment: true,
  })
  const cEtherDelegateContract = await deploy('CEtherDelegate', 'CEtherDelegate', {
    deterministicDeployment: true,
  })
  const CERC20DelegateContract = await deploy('CErc20Delegate', 'CErc20Delegate', {
    deterministicDeployment: true,
  })

  writeAllOutput('comptroller', comptrollerContract.address)
  writeAllOutput('cEtherDelegate', cEtherDelegateContract.address)
  writeAllOutput('cErc20Delegate', CERC20DelegateContract.address)

  const feeDistributorContract = await deploy('FuseFeeDistributor', 'FuseFeeDistributor', {
    proxy: {
      owner: timelock,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            timelock,
            numberToMantissa(0.1),
            comptrollerContract.address,
            cEtherDelegateContract.address,
            CERC20DelegateContract.address,
          ],
        },
      },
    },
    deterministicDeployment: true,
  })

  writeAllOutput('feeDistributor', feeDistributorContract.address)

  const unitrollerArtifact = await deployments.getExtendedArtifact(
    'contracts/rari-fuse/src/core/Unitroller.sol:Unitroller'
  )
  const unitrollerSourceFile = JSON.parse(unitrollerArtifact.metadata!).sources[
    'contracts/rari-fuse/src/core/Unitroller.sol'
  ].content

  if (!unitrollerSourceFile.includes(feeDistributorContract.address)) {
    throw new Error(
      `Incorrect FuseFeeDistributor address, please set address to ${feeDistributorContract.address} in Unitroller.sol`
    )
  }

  const poolDirectoryContract = await deploy('FusePoolDirectory', 'FusePoolDirectory', {
    proxy: {
      owner: timelock,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [timelock, false, []],
        },
      },
    },
    deterministicDeployment: true,
  })

  writeAllOutput('poolDirectory', poolDirectoryContract.address)

  const poolLensContract = await deploy('FusePoolLens', 'FusePoolLens', {
    proxy: {
      owner: timelock,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [poolDirectoryContract.address],
        },
      },
    },
    deterministicDeployment: true,
  })

  writeAllOutput('poolLens', poolLensContract.address)
}

export default deployLendingMarket
deployLendingMarket.id = '020_lending_market'
deployLendingMarket.tags = []
deployLendingMarket.skip = async () => true
