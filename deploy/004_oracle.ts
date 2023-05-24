import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { getUnnamedAccounts } from 'hardhat'
import _ from 'lodash'
import { isAddress } from 'ethers/lib/utils'

import deploy from '../utils/deploy'
import getTimelockAddress from '../utils/getTimelockAddress'
import writeAllOutput from '../utils/writeAllOutput'
import getConfig from '../utils/getConfig'
import view from '../utils/view'
import execute from '../utils/execute'
import writeChainOutput from '../utils/writeChainOutput'

// https://en.wikipedia.org/wiki/ISO_4217
const currencyIsoMap: Record<string, number> = {
  USD: 840,
}

const deployOracle: DeployFunction = async function deployOracle({}: HardhatRuntimeEnvironment) {
  const timelock = await getTimelockAddress()
  const [deployer] = await getUnnamedAccounts()
  const config = getConfig()

  // TODO: should be owned by timelock
  const oracleDeployment = await deploy(
    'MasterPriceOracle',
    'contracts/citrus-oracle/src/MasterPriceOracle.sol:MasterPriceOracle',
    {
      args: [deployer, '0x0000000000000000000000000000000000000840', '0x0000000000000000000000000000000000000000'],
      deterministicDeployment: true,
    }
  )

  const chainlinkOracleDeployment = await deploy(
    'ChainlinkPriceOracle',
    'contracts/citrus-oracle/src/ChainlinkPriceOracle.sol:ChainlinkPriceOracle',
    {
      args: [deployer],
      deterministicDeployment: true,
    }
  )

  writeAllOutput('oracle.master', oracleDeployment.address)
  writeAllOutput('oracle.chainlink', chainlinkOracleDeployment.address)

  /*     Setup Oracles     */

  if (_.uniqBy(config.oracle.tokens, (x) => x.address).length !== config.oracle.tokens.length) {
    throw new Error('Duplicate tokens in oracle config')
  }

  // TODO: check if deployer allowed to update oracle

  {
    // Master Oracle
    const oraclesToUpdate = (
      await Promise.all(
        config.oracle.tokens.map(async (tokenConfig) => {
          const actualOracle = (
            await view(
              'MasterPriceOracle',
              'contracts/citrus-oracle/src/MasterPriceOracle.sol:MasterPriceOracle',
              'oracles',
              [tokenConfig.address]
            )
          ).toLowerCase()

          const expectedOracle = (() => {
            switch (tokenConfig.type) {
              case 'chainlink': {
                return chainlinkOracleDeployment.address.toLowerCase()
              }

              case 'none': {
                return '0x0000000000000000000000000000000000000000'
              }
            }
          })()

          writeChainOutput(`oracle.${tokenConfig.symbol}`, {
            address: tokenConfig.address,
            type: tokenConfig.type,
          })

          return {
            address: tokenConfig.address,
            needsUpdate: actualOracle !== expectedOracle,
            oracle: expectedOracle,
          }
        })
      )
    ).filter((x) => x.needsUpdate)

    if (oraclesToUpdate.length > 0) {
      await execute('MasterPriceOracle', 'contracts/citrus-oracle/src/MasterPriceOracle.sol:MasterPriceOracle', 'add', [
        oraclesToUpdate.map((x) => x.address),
        oraclesToUpdate.map((x) => x.oracle),
      ])
    }
  }

  {
    // Chainlink Oracle
    const chainlinkFeedsToUpdate = (
      await Promise.all(
        config.oracle.tokens
          .filter((x) => x.type === 'chainlink')
          .map(async (tokenConfig) => {
            const actualFeed = (
              await view(
                'ChainlinkPriceOracle',
                'contracts/citrus-oracle/src/ChainlinkPriceOracle.sol:ChainlinkPriceOracle',
                'priceFeeds',
                [tokenConfig.address]
              )
            ).toLowerCase()
            const actualBaseCurrency = (
              await view(
                'ChainlinkPriceOracle',
                'contracts/citrus-oracle/src/ChainlinkPriceOracle.sol:ChainlinkPriceOracle',
                'feedBaseCurrencies',
                [tokenConfig.address]
              )
            ).toLowerCase()

            const expectedFeed = tokenConfig.aggregator.toLowerCase()
            const expectedBaseCurrency = currencyIsoMap[tokenConfig.base]
              ? numberToAddress(currencyIsoMap[tokenConfig.base])
              : tokenConfig.base.toLowerCase()

            if (!isAddress(expectedBaseCurrency)) {
              throw new Error(`${expectedBaseCurrency} is not an address`)
            }

            return {
              address: tokenConfig.address,
              needsUpdate: actualFeed !== expectedFeed || actualBaseCurrency !== expectedBaseCurrency,
              feed: expectedFeed,
              baseCurrency: expectedBaseCurrency,
            }
          })
      )
    ).filter((x) => x.needsUpdate)

    for (const tokenConfigs of _.values(_.groupBy(chainlinkFeedsToUpdate, (x) => x.baseCurrency))) {
      const baseCurrency = tokenConfigs[0].baseCurrency

      await execute(
        'ChainlinkPriceOracle',
        'contracts/citrus-oracle/src/ChainlinkPriceOracle.sol:ChainlinkPriceOracle',
        'setPriceFeeds',
        [tokenConfigs.map((x) => x.address), tokenConfigs.map((x) => x.feed), baseCurrency]
      )
    }
  }
}

export default deployOracle
deployOracle.id = '004_oracle'
deployOracle.tags = []

function numberToAddress(num: number): string {
  return `0x${num.toFixed().padStart(40, '0')}`
}
