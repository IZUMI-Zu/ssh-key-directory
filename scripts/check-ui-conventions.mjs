import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [app, uno, css, html, favicon] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../uno.config.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8'),
])

function shortcut(name) {
  const match = uno.match(new RegExp(`'${name}':\\s*'([^']+)'`))
  assert.ok(match, `Missing semantic shortcut: ${name}`)
  return match[1]
}

for (const name of [
  'bg-base',
  'bg-secondary',
  'bg-active',
  'color-base',
  'color-active',
  'border-base',
  'border-active',
]) {
  assert.match(shortcut(name), /dark:/, `${name} must define a dark-mode value`)
}

for (const name of ['surface-panel', 'surface-row', 'status-badge', 'btn-action', 'btn-icon', 'z-top-nav']) {
  shortcut(name)
}

assert.match(shortcut('status-badge'), /\bh-6\b/, 'Badges need a stable height')
assert.match(shortcut('status-badge'), /\bitems-center\b/, 'Badges must center content vertically')
assert.match(shortcut('status-badge'), /\bjustify-center\b/, 'Badges must center content horizontally')
assert.match(shortcut('status-badge'), /\bleading-none\b/, 'Badge text must not inherit an oversized line box')
assert.match(shortcut('status-badge'), /\bpt-px\b/, 'Mono badge text needs a one-pixel optical correction')
assert.match(shortcut('btn-action'), /\bmin-h-10\b/, 'Action buttons need a 40px minimum height')
assert.match(shortcut('btn-icon'), /\bsize-10\b/, 'Icon buttons need a 40px hit area')
assert.match(app, /\bz-top-nav\b/, 'The sticky header must use a named z-index layer')
assert.match(app, /keyType\.aliases\?\.join/, 'The UI must tolerate cached API responses without type aliases')
assert.match(app, /directory\?schema=3/, 'The UI must version its cached directory API contract')
assert.match(app, /href="#groups"/, 'Primary navigation must expose Groups')
assert.match(app, /id="groups"/, 'The directory must render a Groups section')
assert.match(app, /\/groups\/\$\{group\.group\.handle\}\.keys/, 'Group cards must expose aggregate key endpoints')
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Reduced motion must be honored')
assert.match(html, /rel="icon"[^>]+href="\/favicon\.svg\?v=\d+"/, 'The SVG favicon must use a cache-busted URL')
assert.match(html, /rel="icon"[^>]+sizes="any"/, 'The SVG favicon must declare scalable sizing')
assert.match(favicon, /prefers-color-scheme:\s*dark/, 'The favicon must support dark mode')
assert.match(favicon, /class="mark"/, 'The favicon must include its semantic key mark')
assert.match(favicon, /class="base"/, 'The favicon must use a solid brand tile')
assert.doesNotMatch(favicon, /#863bff/i, 'The default starter favicon must not ship')
assert.doesNotMatch(html, /Example|keys\.example\.dev/, 'Public metadata must not hardcode one deployment')

const forbiddenPatterns = [
  { pattern: /[—–]/u, message: 'Visible copy must not contain em-dash or en-dash characters' },
  { pattern: /\btransition-all\b/, message: 'Transitions must name exact properties' },
  { pattern: /\bz-(?:\d|\[\d)/, message: 'Raw z-index utilities must use named semantic layers' },
  {
    pattern: /\b(?:bg-base|color-base|border-base)\//,
    message: 'Semantic shortcuts must not receive opacity modifiers',
  },
  { pattern: /\bi-\$\{/, message: 'Icon utility names must remain statically extractable' },
  {
    pattern: /\s(?:bg|text|border|color|p|m|w|h)=['"]/,
    message: 'Use class-based utilities instead of Attributify syntax',
  },
]

for (const { pattern, message } of forbiddenPatterns) {
  assert.doesNotMatch(app, pattern, message)
}

const technicalValues = app.match(/font-mono[^\n"']*tabular-nums/g) ?? []
assert.ok(technicalValues.length >= 4, 'Technical counters and fingerprints should use mono tabular numerals')

const truncatedTags = app.match(/<(?:span|p|h3|code)\b[^>]*\btruncate\b[^>]*>/gs) ?? []
assert.ok(truncatedTags.length > 0, 'Expected truncated technical labels in the interface')
for (const tag of truncatedTags) {
  assert.match(tag, /\btitle=/, `Truncated content must preserve its full value in title: ${tag}`)
}

console.log('ui-conventions: antfu pre-flight checks passed')
