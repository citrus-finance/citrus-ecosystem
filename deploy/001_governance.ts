import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import isContractDeployed from '../utils/isContractDeployed'
import getEthers from '../utils/getEthers'
import { getUnnamedAccounts } from 'hardhat'
import { Interface, getCreate2Address, keccak256, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import deploy from '../utils/deploy'
import getTimelockAddress from '../utils/getTimelockAddress'

const deployGovernance: DeployFunction = async function deployGovernance({}: HardhatRuntimeEnvironment) {
  const [deployer] = await getUnnamedAccounts()
  const ethers = getEthers()

  // TODO: deploy Citrus token

  // Deploy multisig
  const defaultMultisigOwners = ['0x0ef8Dcb5b19fb6C779795B682fe8fddeD6Ba0b49']
  const multisig = await deployMultisig(defaultMultisigOwners, 1)

  // TODO: deploy Governance contract

  // Deploy Timelock
  const timelock = await deploy('Timelock', 'Timelock', {
    args: [multisig, 172800],
    skipUpgradeSafety: true,
    deterministicDeployment: true,
  })
}

export default deployGovernance
deployGovernance.id = '002_governance'
deployGovernance.tags = []

async function deployMultisig(defaultMultisigOwners: string[], threshold: number): Promise<string> {
  const [deployer] = await getUnnamedAccounts()
  const ethers = getEthers()

  const multisigFactory = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67'
  const multisigSingleton = '0xc962E67D9490E154D81181879ddf4CD3b65D2132'

  if (!(await isContractDeployed(multisigFactory)) || !(await isContractDeployed(multisigSingleton))) {
    throw new Error(
      'Safe contracts not deployed on this chain, please follow instructions here: https://github.com/safe-global/safe-contracts#custom-networks'
    )
  }

  const singletonInterface = new Interface([
    {
      inputs: [
        { internalType: 'address[]', name: '_owners', type: 'address[]' },
        { internalType: 'uint256', name: '_threshold', type: 'uint256' },
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'bytes', name: 'data', type: 'bytes' },
        { internalType: 'address', name: 'fallbackHandler', type: 'address' },
        { internalType: 'address', name: 'paymentToken', type: 'address' },
        { internalType: 'uint256', name: 'payment', type: 'uint256' },
        { internalType: 'address payable', name: 'paymentReceiver', type: 'address' },
      ],
      name: 'setup',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ])

  const multisigFactoryContract = await ethers.getContractAt(
    [
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'contract SafeProxy', name: 'proxy', type: 'address' },
          { indexed: false, internalType: 'address', name: 'singleton', type: 'address' },
        ],
        name: 'ProxyCreation',
        type: 'event',
      },
      {
        inputs: [
          { internalType: 'address', name: '_singleton', type: 'address' },
          { internalType: 'bytes', name: 'initializer', type: 'bytes' },
          { internalType: 'uint256', name: 'saltNonce', type: 'uint256' },
        ],
        name: 'createProxyWithNonce',
        outputs: [{ internalType: 'contract SafeProxy', name: 'proxy', type: 'address' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [],
        name: 'proxyCreationCode',
        outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
        stateMutability: 'pure',
        type: 'function',
      },
    ],
    multisigFactory,
    deployer
  )

  const initCall = singletonInterface.encodeFunctionData('setup', [
    defaultMultisigOwners,
    BigNumber.from(threshold),
    '0x0000000000000000000000000000000000000000',
    '0x00',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    BigNumber.from(0),
    '0x0000000000000000000000000000000000000000',
  ])
  const saltNonce = BigNumber.from('0')

  const multisigAddress = getCreate2Address(
    multisigFactory,
    solidityKeccak256(['bytes32', 'uint256'], [keccak256(initCall), saltNonce]),
    solidityKeccak256(['bytes', 'uint256'], [await multisigFactoryContract.proxyCreationCode(), multisigSingleton])
  )

  if (await isContractDeployed(multisigAddress)) {
    return multisigAddress
  }

  const tx = await multisigFactoryContract.createProxyWithNonce(multisigSingleton, initCall, saltNonce)
  const receipt = await tx.wait(1)

  if (multisigAddress !== receipt.events[1].args.proxy) {
    throw new Error('Multisig deployment failed, computed address is different than deployed address')
  }

  return multisigAddress
}
