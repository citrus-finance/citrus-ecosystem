import fs from 'fs'

import _ from 'lodash'

interface Output {
  timelock: string
}

export default function writeAllOutput<P extends string>(
  path: P,
  value: GetFieldType<Output, P>,
  allowOverwrite = false
) {
  const p = '/output/all.json'

  const outputData = (() => {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {
      return {}
    }
  })()

  if (!allowOverwrite && _.get(outputData, path) != undefined && _.get(outputData, path) !== value) {
    throw new Error(``)
  }

  _.set(outputData, path, value)

  fs.writeFileSync(p, JSON.stringify(outputData, null, 2), 'utf-8')
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
