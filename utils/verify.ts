import { TASK_ETHERSCAN_VERIFY, TASK_SOURCIFY } from 'hardhat-deploy'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export async function verifyAllContracts(_taskArguments: string[], hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const apiKey = hre.config.etherscan.apiKey[hre.network.name]

  if (apiKey) {
    await hre.run(TASK_ETHERSCAN_VERIFY, {
      apiKey,
      sleep: true,
    })
  } else {
    await hre.run(TASK_SOURCIFY, {})
  }
}
