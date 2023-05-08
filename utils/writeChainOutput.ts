import fs from 'fs'

import hardhat from 'hardhat'
import _ from 'lodash'

interface Output {
  erc4626Router: string
  vault: {
    lens: string
    vaults: {
      address: string
      name: string
      asset: {
        name: string
        symbol: string
        iconUrl: string
        isWrappedNative: boolean
      }
      withdrawalFeePercentage: number
      harvestFeePercentage: number
    }[]
    harverters: {
      balancerManager: string
      swapper: string
    }
  }
}

export default function writeChainOutput<P extends string>(path: P, value: GetFieldType<Output, P>) {
  const p = getFilePath()

  const outputData = (() => {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {
      return {}
    }
  })()

  _.set(outputData, path, value)

  fs.writeFileSync(p, JSON.stringify(outputData, null, 2), 'utf-8')
}

function getFilePath(): string {
  if (hardhat.network.name === 'localhost' || hardhat.network.name === 'hardhat') {
    return process.cwd() + '/output/dev.json'
  }

  return process.cwd() + `/output/${hardhat.network.name}.json`
}

type GetIndexedField<T, K> = K extends keyof T
  ? T[K]
  : K extends `${number}`
  ? '0' extends keyof T
    ? undefined
    : number extends keyof T
    ? T[number]
    : undefined
  : undefined

type FieldWithPossiblyUndefined<T, Key> = GetFieldType<Exclude<T, undefined>, Key> | Extract<T, undefined>

type IndexedFieldWithPossiblyUndefined<T, Key> = GetIndexedField<Exclude<T, undefined>, Key> | Extract<T, undefined>

export type GetFieldType<T, P> = P extends `${infer Left}.${infer Right}`
  ? Left extends keyof T
    ? FieldWithPossiblyUndefined<T[Left], Right>
    : Left extends `${infer FieldKey}[${infer IndexKey}]`
    ? FieldKey extends keyof T
      ? FieldWithPossiblyUndefined<IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>, Right>
      : undefined
    : undefined
  : P extends keyof T
  ? T[P]
  : P extends `${infer FieldKey}[${infer IndexKey}]`
  ? FieldKey extends keyof T
    ? IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>
    : undefined
  : undefined
