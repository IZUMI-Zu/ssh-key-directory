import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const [english, chinese, deploymentEnglish, deploymentChinese, exampleConfig, gitignore, packageSource] = await Promise.all([
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('README.zh-CN.md', root), 'utf8'),
  readFile(new URL('docs/deployment.md', root), 'utf8'),
  readFile(new URL('docs/deployment.zh-CN.md', root), 'utf8'),
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
assert.match(english, /docs\/deployment\.md/, 'English README must link the deployment guide')
assert.match(chinese, /docs\/deployment\.zh-CN\.md/, 'Chinese README must link the deployment guide')

for (const document of [english, chinese, deploymentEnglish, deploymentChinese]) {
  assert.doesNotMatch(document, /https:\/\/keys\.(?!example\.com)/i, 'Key-directory examples must use keys.example.com')
  assert.doesNotMatch(document, /[—–]/u, 'Documentation must not contain em-dash or en-dash characters')
}

for (const [document, language] of [[deploymentEnglish, 'English'], [deploymentChinese, 'Chinese']]) {
  assert.match(document, /Deploy to Cloudflare/, `${language} deployment guide must explain one-click deployment`)
  assert.match(document, /wrangler\.local\.jsonc/, `${language} deployment guide must explain Custom Domains`)
  assert.match(document, /directory\.config\.example\.ts/, `${language} deployment guide must explain Git-based configuration`)
  assert.match(document, /directory\.config\.ts/, `${language} deployment guide must explain local configuration`)
  assert.match(document, /curl -fsSL/, `${language} deployment guide must include endpoint verification`)
  assert.match(document, /authorized_keys/, `${language} deployment guide must include safe server installation`)
}
assert.doesNotMatch(exampleConfig, /[—–]/u, 'Example config comments must not contain em-dash or en-dash characters')

for (const expected of ["handle: 'example'", "aliases: ['demo']", 'groups:', "members: ['example', 'team']"]) {
  assert.match(exampleConfig, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Example config is missing: ${expected}`)
}
assert.match(gitignore, /^keys\/directory\.config\.ts$/m, 'Personal directory config must remain ignored')
assert.equal(packageJson.scripts['config:init'], 'node scripts/ensure-directory-config.mjs')
assert.equal(packageJson.scripts.prepare, 'pnpm run config:init')
assert.equal(packageJson.scripts['deploy:dry-run'], 'pnpm run build && wrangler deploy --dry-run')

for (const [document, documentBase] of [
  [english, root],
  [chinese, root],
  [deploymentEnglish, new URL('docs/', root)],
  [deploymentChinese, new URL('docs/', root)],
]) {
  const relativeLinks = [...document.matchAll(/\[[^\]]+\]\(((?:\.\.\/|\.\/)[^)#]+)(?:#[^)]+)?\)/g)]
  for (const [, relativePath] of relativeLinks) {
    await access(new URL(relativePath, documentBase))
  }
}

console.log('documentation: bilingual links and configuration examples passed')
