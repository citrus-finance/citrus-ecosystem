import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { numberToMantissa } from '../utils/number'
import deploy from '../utils/deploy'
import writeAllOutput from '../utils/writeAllOutput'
import { BigNumber } from 'ethers'

const deployInterestRateModels: DeployFunction =
  async function deployInterestRateModels({}: HardhatRuntimeEnvironment) {
    const generalInterestRateModel = await deploy('GeneralJumpRateModel', 'JumpRateModelV2', {
      args: [
        ...getInterestRateModelArgs(
          numberToMantissa(0),
          numberToMantissa(0.07),
          numberToMantissa(0.75),
          numberToMantissa(0.5)
        ),
        '0x0000000000000000000000000000000000000000',
      ],
      deterministicDeployment: true,
    })

    writeAllOutput('interestRateModels.general', generalInterestRateModel.address)

    const stableInterestRateModel = await deploy('StableJumpRateModel', 'JumpRateModelV2', {
      args: [
        ...getInterestRateModelArgs(
          numberToMantissa(0),
          numberToMantissa(0.032),
          numberToMantissa(0.25),
          numberToMantissa(0.8)
        ),
        '0x0000000000000000000000000000000000000000',
      ],
      deterministicDeployment: true,
    })

    writeAllOutput('interestRateModels.stable', stableInterestRateModel.address)
  }

export default deployInterestRateModels
deployInterestRateModels.id = '021_interest_rate_models'
deployInterestRateModels.tags = []
deployInterestRateModels.skip = async () => true

const ONE = numberToMantissa(1)

function getInterestRateModelArgs(
  baseApr: BigNumber,
  targetApr: BigNumber,
  maxApr: BigNumber,
  targetUtilization: BigNumber
) {
  return [
    baseApr,
    targetApr.sub(baseApr).mul(ONE).div(targetUtilization),
    maxApr.sub(targetApr).mul(ONE).div(ONE.sub(targetUtilization)),
    targetUtilization,
  ]
}
