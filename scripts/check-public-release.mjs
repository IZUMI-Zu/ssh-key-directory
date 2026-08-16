import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const trackedOutput = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'buffer',
})
const trackedPaths = trackedOutput
  .toString('utf8')
  .split('\0')
  .filter(Boolean)

assert.ok(trackedPaths.length > 0, 'The release audit requires a Git checkout with tracked files')

const localOnlyPaths = [
  'keys/directory.config.ts',
  'wrangler.local.jsonc',
]
for (const path of localOnlyPaths) {
  assert.ok(!trackedPaths.includes(path), `${path} contains deployment-specific data and must stay untracked`)
}

const privateKeyPath = /(?:^|\/)(?:id_(?:dsa|ecdsa|ecdsa_sk|ed25519|ed25519_sk|rsa)|[^/]+\.(?:key|pem|ppk))$/i
for (const path of trackedPaths) {
  assert.doesNotMatch(path, privateKeyPath, `Private-key file must not be tracked: ${path}`)
}

const forbiddenContent = [
  {
    pattern: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/,
    message: 'PEM private-key material',
  },
  {
    pattern: /^PuTTY-User-Key-File-/m,
    message: 'PuTTY private-key material',
  },
  {
    pattern: /\b(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}\b/,
    message: 'GitHub credential',
  },
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    message: 'AWS access key',
  },
  {
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/,
    message: 'Stripe credential',
  },
  {
    pattern: /\b(?:CLOUDFLARE_API_KEY|CLOUDFLARE_API_TOKEN)\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/i,
    message: 'Cloudflare credential',
  },
  {
    pattern: /\b[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|icloud|protonmail|qq|163)\.[A-Z]{2,}\b/i,
    message: 'personal email address',
  },
  {
    pattern: /(?:[A-Z]:\\Users\\|\/Users\/)[^\s"'<>]+/i,
    message: 'local user profile path',
  },
]

let scannedFileCount = 0
for (const path of trackedPaths) {
  let source
  try {
    source = await readFile(new URL(path, new URL('../', import.meta.url)))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue
    throw error
  }
  scannedFileCount += 1
  if (source.includes(0)) continue
  const text = source.toString('utf8')
  for (const { pattern, message } of forbiddenContent) {
    assert.doesNotMatch(text, pattern, `${path} contains ${message}`)
  }
}

for (const path of ['README.md', 'README.zh-CN.md', 'docs/deployment.md', 'docs/deployment.zh-CN.md']) {
  const source = await readFile(new URL(path, new URL('../', import.meta.url)), 'utf8')
  const keyDirectoryHosts = [...source.matchAll(/https:\/\/(keys\.[a-z0-9.-]+)/gi)]
    .map((match) => match[1].toLowerCase())
  assert.ok(
    keyDirectoryHosts.every((hostname) => hostname === 'keys.example.com'),
    `${path} must use keys.example.com for deployment examples`,
  )
}

console.log(`public-release: ${scannedFileCount} tracked files passed privacy checks`)
