import { TASK_ETHERSCAN_VERIFY, TASK_SOURCIFY } from 'hardhat-deploy'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export async function verifyAllContracts(_taskArguments: string[], hre: HardhatRuntimeEnvironment) {
  const networkConfigs = {
    100: {
      // gnosis
      apiKey: process.env.GNOSISSCAN_API_KEY,
      apiUrl: 'https://api.gnosisscan.io/',
    },
  }

  const chainId = await hre.getChainId()

  await hre.run(TASK_ETHERSCAN_VERIFY, {
    sleep: true,
    // @ts-ignore
    ...networkConfigs[chainId],
  })

  await hre.run(TASK_SOURCIFY, {})
}
