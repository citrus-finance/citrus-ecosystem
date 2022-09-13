import hardhat from 'hardhat'

export const isLocalhost = hardhat.network.name === 'localhost' || hardhat.network.name === 'hardhat'

export const isTestnet = isLocalhost || hardhat.network.name === 'rinkeby'
