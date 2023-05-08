import { readFileSync } from 'fs'
import path from 'path'

import findUp from 'find-up'
import multimatch from 'multimatch'

import { task, subtask } from 'hardhat/config'
import { HardhatUserConfig } from 'hardhat/types'

import { verifyAllContracts } from './utils/verify'
import { assertStorageLayoutChangeSafeForAll } from './utils/storageLayout'

import 'dotenv/config'

import '@openzeppelin/hardhat-upgrades'
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import '@nomiclabs/hardhat-ethers'

import {
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  TASK_COMPILE_SOLIDITY_READ_FILE,
} from 'hardhat/builtin-tasks/task-names'

task('checkUpgradabilityAll', 'Checks storage slot upgradability for all contracts').setAction(
  assertStorageLayoutChangeSafeForAll
)

task('verifyAllContracts', 'Verify all contracts').setAction(verifyAllContracts)

const sourcePaths = [
  'contracts/citrus-vaults/**/*.sol',
  '!contracts/citrus-vaults/lib/BoringSolidity/contracts/mocks/**/*.sol',
  'contracts/ERC4626-router/**/*.sol',
  '!contracts/ERC4626-router/src/test/**/*.sol',
  '!contracts/ERC4626-router/lib/solmate/src/test/**/*.sol',
  'contracts/rari-fuse/src/**/*.sol',
  '!**/ds-test/**/*.sol',
  '!**/forge-std/**/*.sol',
  '!**/*.t.sol',
  '!**/test/**/*.sol',
]

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, __, runSuper) => {
  const paths: string[] = await runSuper()

  return multimatch(
    paths,
    sourcePaths.map((x) => (x[0] === '!' ? `!${process.cwd()}/${x.slice(1)}` : `${process.cwd()}/${x}`))
  )
})

subtask(
  TASK_COMPILE_SOLIDITY_READ_FILE,
  async ({ absolutePath }: { absolutePath: string }, hre, runSuper): Promise<string> => {
    let content = await runSuper({ absolutePath })

    return content
      .split(/\r?\n/)
      .map((line: string) => {
        if (line.match(/^\s*import /i)) {
          getRemappings(absolutePath).forEach(([find, replace]) => {
            if (!replace.includes('node_modules') && line.match(find)) {
              line = line.replace(find, replace)
            }
          })
        }
        return line
      })
      .join('\n')
  }
)

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
        version: '0.5.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
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
}

export default config
