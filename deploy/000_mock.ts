import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import getConfig from '../utils/getConfig'
import deploy from '../utils/deploy'

const deployMocks: DeployFunction = async function deployMocks({}: HardhatRuntimeEnvironment) {
  const config = getConfig()

  for (let symbol in config.tokens) {
    const token = config.tokens[symbol]

    if (token === 'WETH') {
      await deploy('WETH', 'contracts/citrus-vaults/lib/solmate/src/tokens/WETH.sol:WETH', {
        args: [],
        skipIfAlreadyDeployed: true,
      })
    } else if (typeof token === 'object') {
      await deploy(symbol, 'MockERC20', {
        args: [token.name, token.symbol, token.decimals],
        skipIfAlreadyDeployed: true,
      })
    }
  }
}

export default deployMocks
deployMocks.id = '000_mock'
deployMocks.tags = []
