import assert from 'node:assert/strict'
import directoryConfig from '../keys/directory.config.ts'
import exampleDirectoryConfig from '../keys/directory.config.example.ts'
import { createWorker } from '../worker/index.ts'
import {
  buildDirectory,
  buildDirectoryRegistry,
  createEtag,
  findDirectory,
  findGroup,
  findSupportedKeyType,
  InvalidKeySourceError,
  SUPPORTED_KEY_TYPES,
} from '../worker/key-directory.ts'

function sshString(value) {
  const bytes = Buffer.from(value)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(bytes.length)
  return Buffer.concat([length, bytes])
}

function publicKeyPayload(type, seed) {
  const keyMaterial = Uint8Array.from({ length: 32 }, (_, index) => (index + seed) % 256)
  return Buffer.concat([sshString(type), sshString(keyMaterial)]).toString('base64')
}

const keys = SUPPORTED_KEY_TYPES.map(({ type, shortName }, index) => ({
  type: shortName,
  publicKey: publicKeyPayload(type, index + 1),
  comment: `test-key-${index + 1}`,
  options: type === 'sk-ssh-ed25519@openssh.com'
    ? 'verify-required'
    : type === 'ssh-rsa'
      ? 'cert-authority,principals="example",restrict'
      : undefined,
}))

const typeNames = SUPPORTED_KEY_TYPES.flatMap(({ type, shortName, aliases }) => [
  type,
  shortName,
  ...aliases,
])
assert.equal(new Set(typeNames).size, typeNames.length)

for (const [typeIndex, keyType] of SUPPORTED_KEY_TYPES.entries()) {
  for (const name of [keyType.type, keyType.shortName, ...keyType.aliases]) {
    const aliasDirectory = await buildDirectory({
      handle: 'type-test',
      displayName: 'Type Test',
      keys: [{ type: name, publicKey: publicKeyPayload(keyType.type, typeIndex + 30) }],
    })
    assert.equal(aliasDirectory.keys[0].type, keyType.type)
  }
}

assert.equal(findSupportedKeyType('ED')?.shortName, 'ed25519')
assert.equal(findSupportedKeyType('sk-ed25519')?.shortName, 'ed25519-sk')
assert.equal(findSupportedKeyType('not-a-key-type'), undefined)

const testConfig = {
  identities: [
    {
      handle: 'primary',
      displayName: 'Primary User',
      aliases: ['main'],
      keys,
    },
    {
      handle: 'secondary',
      displayName: 'Secondary User',
      aliases: ['backup'],
      keys: [keys[0]],
    },
  ],
  groups: [
    {
      handle: 'operators',
      displayName: 'Operators',
      aliases: ['ops'],
      members: ['main', 'backup'],
    },
  ],
}
const registry = await buildDirectoryRegistry(testConfig)

assert.equal(registry.configured, true)
assert.equal(registry.identityCount, 2)
assert.equal(registry.groupCount, 1)
assert.equal(registry.keyCount, SUPPORTED_KEY_TYPES.length + 1)
assert.equal(findDirectory(registry, 'main')?.owner.handle, 'primary')
assert.equal(findDirectory(registry, 'backup')?.owner.handle, 'secondary')
assert.equal(findDirectory(registry, 'missing'), undefined)

const operators = findGroup(registry, 'ops')
assert.ok(operators)
assert.equal(operators.group.handle, 'operators')
assert.equal(operators.memberCount, 2)
assert.equal(operators.count, SUPPORTED_KEY_TYPES.length)
assert.deepEqual(operators.members.map((member) => member.handle), ['primary', 'secondary'])
assert.equal(findGroup(registry, 'missing'), undefined)

const directory = findDirectory(registry, 'primary')
assert.ok(directory)
assert.equal(directory.count, SUPPORTED_KEY_TYPES.length)
assert.deepEqual(directory.supportedTypes, SUPPORTED_KEY_TYPES)
assert.equal(directory.keys[0].typeShortName, 'ed25519')
assert.match(directory.keys[0].authorizedKey, /^ssh-ed25519 /)

const securityKey = directory.keys.find((key) => key.type === 'sk-ssh-ed25519@openssh.com')
assert.equal(securityKey.securityKey, true)
assert.equal(securityKey.touchRequired, true)
assert.equal(securityKey.verificationRequired, true)

const rsaCa = directory.keys.find((key) => key.type === 'ssh-rsa')
assert.equal(rsaCa.certificateAuthority, true)
assert.equal(rsaCa.restricted, true)

const postQuantumKey = directory.keys.find((key) => key.type === 'ssh-mldsa44-ed25519@openssh.com')
assert.equal(postQuantumKey.postQuantum, true)
assert.match(directory.keys[0].fingerprint, /^SHA256:[A-Za-z0-9+/]+$/)

const emptyDirectory = await buildDirectory({
  handle: 'empty',
  displayName: 'Empty',
  keys: [],
})
assert.equal(emptyDirectory.configured, false)
assert.equal(emptyDirectory.count, 0)

await assert.rejects(
  () => buildDirectory({
    handle: 'primary',
    displayName: 'Primary User',
    keys: [keys[0], keys[0]],
  }),
  (error) => error instanceof InvalidKeySourceError && /duplicate public key/i.test(error.message),
)

await assert.rejects(
  () => buildDirectoryRegistry({
    identities: [{ handle: 'one', displayName: 'One', keys: [] }],
    groups: [{ handle: 'ops', displayName: 'Ops', members: ['missing'] }],
  }),
  (error) => error instanceof InvalidKeySourceError && /unknown identity or alias missing/.test(error.message),
)

await assert.rejects(
  () => buildDirectoryRegistry({
    identities: [{ handle: 'one', displayName: 'One', aliases: ['first'], keys: [] }],
    groups: [{ handle: 'ops', displayName: 'Ops', members: ['one', 'first'] }],
  }),
  (error) => error instanceof InvalidKeySourceError && /includes identity one more than once/.test(error.message),
)

await assert.rejects(
  () => buildDirectoryRegistry({
    identities: [{ handle: 'one', displayName: 'One', keys: [] }],
    groups: [
      { handle: 'admins', displayName: 'Admins', aliases: ['shared'], members: ['one'] },
      { handle: 'operators', displayName: 'Operators', aliases: ['shared'], members: ['one'] },
    ],
  }),
  (error) => error instanceof InvalidKeySourceError && /Group route alias shared/.test(error.message),
)

await assert.rejects(
  () => buildDirectoryRegistry({
    identities: [
      { handle: 'one', displayName: 'One', aliases: ['shared'], keys: [] },
      { handle: 'two', displayName: 'Two', aliases: ['shared'], keys: [] },
    ],
  }),
  (error) => error instanceof InvalidKeySourceError && /Route alias shared/.test(error.message),
)

await assert.rejects(
  () => buildDirectory({
    handle: 'invalid',
    displayName: 'Invalid',
    keys: [{ type: 'ed25519', publicKey: 'not-base64' }],
  }),
  (error) => error instanceof InvalidKeySourceError && /key 1/.test(error.message),
)

const configuredRegistry = await buildDirectoryRegistry(directoryConfig)
const exampleRegistry = await buildDirectoryRegistry(exampleDirectoryConfig)
assert.equal(exampleRegistry.identityCount, 2)
assert.equal(exampleRegistry.groupCount, 1)
assert.equal(exampleRegistry.keyCount, 2)
assert.equal(findDirectory(exampleRegistry, 'demo')?.owner.handle, 'example')
assert.equal(findGroup(exampleRegistry, 'ops')?.memberCount, 2)
assert.equal(findGroup(exampleRegistry, 'ops')?.members[1].handle, 'teammate')
assert.equal(configuredRegistry.identityCount, directoryConfig.identities.length)
assert.equal(configuredRegistry.groupCount, directoryConfig.groups?.length ?? 0)
assert.equal(
  configuredRegistry.keyCount,
  configuredRegistry.identities.reduce((total, identity) => total + identity.count, 0),
)
for (const identityConfig of directoryConfig.identities) {
  const configuredIdentity = findDirectory(configuredRegistry, identityConfig.handle)
  assert.ok(configuredIdentity)
  for (const alias of identityConfig.aliases ?? []) {
    assert.equal(findDirectory(configuredRegistry, alias)?.owner.handle, identityConfig.handle)
  }
}
for (const groupConfig of directoryConfig.groups ?? []) {
  const configuredGroup = findGroup(configuredRegistry, groupConfig.handle)
  assert.ok(configuredGroup)
  for (const alias of groupConfig.aliases ?? []) {
    assert.equal(findGroup(configuredRegistry, alias)?.group.handle, groupConfig.handle)
  }
}

assert.equal(await createEtag('stable'), await createEtag('stable'))
assert.notEqual(await createEtag('stable'), await createEtag('changed'))

const worker = createWorker(testConfig)

async function workerRequest(path, init) {
  return worker.fetch(new Request(`https://keys.example.com${path}`, init))
}

const directoryIndexResponse = await workerRequest('/api/v1/directory')
assert.equal(directoryIndexResponse.status, 200)
const directoryIndex = await directoryIndexResponse.json()
assert.ok(directoryIndex.supportedTypes.every((keyType) => Array.isArray(keyType.aliases)))
assert.deepEqual(directoryIndex.supportedTypes[0].aliases, ['ed'])
assert.equal(directoryIndex.groupCount, 1)
assert.equal(directoryIndex.groups[0].endpoints.authorizedKeys, 'https://keys.example.com/groups/operators.keys')

const filteredKeyResponse = await workerRequest('/primary.keys?type=ed')
assert.equal(filteredKeyResponse.status, 200)
assert.equal(filteredKeyResponse.headers.get('X-Key-Type'), 'ed25519')
assert.match(await filteredKeyResponse.text(), /^ssh-ed25519 /)

const filteredAliasResponse = await workerRequest('/main.keys?type=ssh-ed25519')
assert.equal(filteredAliasResponse.status, 200)
assert.match(await filteredAliasResponse.text(), /^ssh-ed25519 /)

const filteredJsonResponse = await workerRequest('/api/v1/identities/main?type=ED')
assert.equal(filteredJsonResponse.status, 200)
const filteredJson = await filteredJsonResponse.json()
assert.equal(filteredJson.owner.handle, 'primary')
assert.equal(filteredJson.count, 1)
assert.equal(filteredJson.endpoints.authorizedKeys, 'https://keys.example.com/primary.keys?type=ed25519')

const groupKeyResponse = await workerRequest('/groups/ops.keys?type=ed')
assert.equal(groupKeyResponse.status, 200)
assert.equal(groupKeyResponse.headers.get('X-Key-Group'), 'operators')
assert.equal(groupKeyResponse.headers.get('X-Key-Type'), 'ed25519')
assert.equal((await groupKeyResponse.text()).trim().split('\n').length, 1)

const groupJsonResponse = await workerRequest('/api/v1/groups/ops')
assert.equal(groupJsonResponse.status, 200)
const groupJson = await groupJsonResponse.json()
assert.equal(groupJson.group.handle, 'operators')
assert.equal(groupJson.memberCount, 2)
assert.equal(groupJson.count, SUPPORTED_KEY_TYPES.length)
assert.equal(groupJson.endpoints.metadata, 'https://keys.example.com/groups/operators.json')

const groupsResponse = await workerRequest('/api/v1/groups')
assert.equal(groupsResponse.status, 200)
const groupsIndex = await groupsResponse.json()
assert.equal(groupsIndex.groupCount, 1)
assert.equal(groupsIndex.groups[0].group.aliases[0], 'ops')

assert.equal((await workerRequest('/secondary.keys?type=ecdsa-sk')).status, 404)
assert.equal((await workerRequest('/groups/operators.keys?type=unknown')).status, 400)
assert.equal((await workerRequest('/groups/missing.keys')).status, 404)
assert.equal((await workerRequest('/primary.keys?type=unknown')).status, 400)
assert.equal((await workerRequest('/primary.keys?type=ed&type=rsa')).status, 400)

console.log('key-directory: all checks passed')
