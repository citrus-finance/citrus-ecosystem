import { readFileSync } from 'fs'
import path from 'path'

import '@nomicfoundation/hardhat-toolbox'
import findUp from 'find-up'
import multimatch from 'multimatch'

import { task, subtask } from 'hardhat/config'
import { HardhatRuntimeEnvironment, HardhatUserConfig } from 'hardhat/types'

import { verifyAllContracts } from './utils/verify'
import { assertStorageLayoutChangeSafeForAll } from './utils/storageLayout'

import 'dotenv/config'

import '@openzeppelin/hardhat-upgrades'
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-preprocessor'

import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from 'hardhat/builtin-tasks/task-names'

task('checkUpgradabilityAll', 'Checks storage slot upgradability for all contracts').setAction(
  assertStorageLayoutChangeSafeForAll
)

task('verifyAllContracts', 'Verify all contracts').setAction(verifyAllContracts)

const sourcePaths = [
  'contracts/citrus-vaults',
  '!contracts/citrus-vaults/lib/BoringSolidity/contracts/mocks',
  'contracts/ERC4626-router',
  '!contracts/ERC4626-router/src/test',
  '!contracts/ERC4626-router/lib/solmate/src/test',
  '!**/ds-test',
]

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, __, runSuper) => {
  const paths: string[] = await runSuper()

  return multimatch(
    paths,
    sourcePaths.map((x) =>
      x[0] === '!' ? `!${process.cwd()}/${x.slice(1)}/**/*.sol` : `${process.cwd()}/${x}/**/*.sol`
    )
  )
})

function getRemappings(filePath: string): string[][] {
  const remappingsPath = findUp.sync('remappings.txt', {
    cwd: path.dirname(filePath),
  })

  if (!remappingsPath) {
    return []
  }

  const relativePath = path.relative(path.dirname(filePath), path.dirname(remappingsPath))

  return readFileSync(remappingsPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.trim().split('='))
    .map((x) => [x[0], relativePath + '/' + x[1]])
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.15',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.10',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 999,
      initialBaseFeePerGas: 0,
    },
    localhost: {
      timeout: 60000,
    },
    xdai: {
      url: process.env.GNOSIS_PROVIDER_URL,
      accounts: [process.env.GNOSIS_DEPLOYER_PK!],
      gas: 'auto',
      gasPrice: 2000000000,
    },
  },
  paths: {},
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  // @ts-ignore
  preprocess: {
    eachLine: (hre: HardhatRuntimeEnvironment) => ({
      transform: (line: string, sourceInfo: { absolutePath: string }) => {
        if (line.match(/^\s*import /i)) {
          getRemappings(sourceInfo.absolutePath).forEach(([find, replace]) => {
            if (line.match(find)) {
              line = line.replace(find, replace)
            }
          })
        }
        return line
      },
    }),
  },
}

export default config
