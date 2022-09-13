import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import deploy from '../utils/deploy'

const deployTimelock: DeployFunction = async function deployTimelock({}: HardhatRuntimeEnvironment) {
  // await deploy('Timelock', 'TimelockController', {
  //   args: [2 * 24 * 3600, [], []],
  //   skipIfAlreadyDeployed: true,
  // });
}

export default deployTimelock
deployTimelock.id = '001_timelock'
deployTimelock.tags = []
