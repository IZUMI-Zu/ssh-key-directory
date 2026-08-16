import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const [english, chinese, exampleConfig, gitignore, packageSource] = await Promise.all([
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('README.zh-CN.md', root), 'utf8'),
  readFile(new URL('keys/directory.config.example.ts', root), 'utf8'),
  readFile(new URL('.gitignore', root), 'utf8'),
  readFile(new URL('package.json', root), 'utf8'),
])
const packageJson = JSON.parse(packageSource)

assert.match(english, /\[简体中文\]\(\.\/README\.zh-CN\.md\)/, 'English README must link to Chinese')
assert.match(chinese, /\[English\]\(\.\/README\.md\)/, 'Chinese README must link to English')
assert.match(english, /Deploy to Cloudflare/, 'English README must expose one-click deployment')
assert.match(chinese, /Deploy to Cloudflare/, 'Chinese README must expose one-click deployment')
assert.match(english, /directory\.config\.example\.ts/, 'English README must link the complete example')
assert.match(chinese, /directory\.config\.example\.ts/, 'Chinese README must link the complete example')

for (const document of [english, chinese]) {
  assert.doesNotMatch(document, /\/(?:example|demo)\.(?:keys|json)|keys\.example\.dev/i, 'README examples must not contain deployment-specific routes')
  assert.doesNotMatch(document, /[—–]/u, 'Documentation must not contain em-dash or en-dash characters')
}
assert.doesNotMatch(exampleConfig, /\b(?:example|demo|example)\b/i, 'Example config must not contain deployment-specific names')
assert.doesNotMatch(exampleConfig, /[—–]/u, 'Example config comments must not contain em-dash or en-dash characters')

for (const expected of ["handle: 'example'", "aliases: ['demo']", 'groups:', "members: ['example', 'team']"]) {
  assert.match(exampleConfig, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Example config is missing: ${expected}`)
}
assert.match(gitignore, /^keys\/directory\.config\.ts$/m, 'Personal directory config must remain ignored')
assert.equal(packageJson.scripts['config:init'], 'node scripts/ensure-directory-config.mjs')
assert.equal(packageJson.scripts.prepare, 'pnpm run config:init')

for (const document of [english, chinese]) {
  const relativeLinks = [...document.matchAll(/\[[^\]]+\]\((\.\/[^)#]+)(?:#[^)]+)?\)/g)]
  for (const [, relativePath] of relativeLinks) {
    await access(new URL(relativePath, root))
  }
}

console.log('documentation: bilingual links and configuration examples passed')
