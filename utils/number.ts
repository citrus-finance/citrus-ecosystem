import { BigNumber } from '@ethersproject/bignumber'

export function numberToMantissa(number: number): BigNumber {
  // eslint-disable-next-line prefer-const
  let [integrerPart, decimalPart] = number.toString().split('.')

  if (!decimalPart) {
    decimalPart = ''
  }

  return BigNumber.from(integrerPart + decimalPart.slice(0, 18).padEnd(18, '0'))
}
