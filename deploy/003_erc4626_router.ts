import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import deploy from '../utils/deploy'
import getTokenAddress from '../utils/getTokenAddress'
import getConfig from '../utils/getConfig'
import writeChainOutput from '../utils/writeChainOutput'

const deployERC4626Router: DeployFunction = async function deployERC4626Router({}: HardhatRuntimeEnvironment) {
  const config = getConfig()

  const routerDeployment = await deploy('ERC4626Router', 'ERC4626Router', {
    args: [await getTokenAddress(config.weth)],
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
  })

  writeChainOutput('erc4626Router', routerDeployment.address)
}

export default deployERC4626Router
deployERC4626Router.id = '003_erc4626_router'
deployERC4626Router.tags = []
