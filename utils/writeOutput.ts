import fs from 'fs'

import hardhat from 'hardhat'
import _, { PropertyPath } from 'lodash'

export default function writeOutput(path: PropertyPath, value: any) {
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
