import getEthers from './getEthers'

export default async function getTimelockAddress(): Promise<string> {
  const ethers = getEthers()

  const timelockContract = await ethers.getContract('Timelock')
  return timelockContract.address
}
