import { constants } from 'node:fs'
import { access, copyFile } from 'node:fs/promises'

const target = new URL('../keys/directory.config.ts', import.meta.url)
const example = new URL('../keys/directory.config.example.ts', import.meta.url)

try {
  await access(target, constants.F_OK)
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  await copyFile(example, target, constants.COPYFILE_EXCL)
  console.log('Created keys/directory.config.ts from the complete example configuration.')
}
