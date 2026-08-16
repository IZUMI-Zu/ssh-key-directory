import {
  findSupportedKeyType,
  SUPPORTED_KEY_TYPES,
  type KeyFamily,
  type KeyTypeInput,
  type SupportedKeyType,
} from '../src/key-types.ts'

export {
  findSupportedKeyType,
  SUPPORTED_KEY_TYPES,
  type KeyFamily,
  type KeyTypeInput,
  type SupportedKeyType,
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const KEY_PATTERN = new RegExp(
  `(^|\\s)(${SUPPORTED_KEY_TYPES.map(({ type }) => escapeRegExp(type)).join('|')})\\s+([A-Za-z0-9+/]+={0,3})(?:\\s+(.*))?$`,
)
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,30}[a-z0-9])?$/

const FLAG_OPTIONS = [
  'cert-authority',
  'restrict',
  'no-agent-forwarding',
  'no-port-forwarding',
  'no-pty',
  'no-user-rc',
  'no-X11-forwarding',
  'no-touch-required',
  'verify-required',
] as const

export interface PublicKeyConfig {
  type: KeyTypeInput
  publicKey: string
  comment?: string
  options?: string
}

export interface IdentityConfig {
  handle: string
  displayName: string
  aliases?: readonly string[]
  keys: readonly PublicKeyConfig[]
}

export interface GroupConfig {
  handle: string
  displayName: string
  aliases?: readonly string[]
  members: readonly string[]
}

export interface DirectoryRegistryConfig {
  identities: readonly IdentityConfig[]
  groups?: readonly GroupConfig[]
}

export function defineDirectoryConfig<const Config extends DirectoryRegistryConfig>(config: Config): Config {
  return config
}

export interface PublicKeyRecord {
  id: string
  type: string
  typeShortName: string
  typeLabel: string
  family: KeyFamily
  comment: string | null
  fingerprint: string
  authorizedKey: string
  options: string[]
  securityKey: boolean
  postQuantum: boolean
  certificateAuthority: boolean
  restricted: boolean
  touchRequired: boolean
  verificationRequired: boolean
}

export interface KeyDirectory {
  schemaVersion: 3
  owner: {
    handle: string
    displayName: string
    aliases: string[]
  }
  configured: boolean
  count: number
  keys: PublicKeyRecord[]
  supportedTypes: SupportedKeyType[]
}

export interface KeyGroup {
  schemaVersion: 3
  group: {
    handle: string
    displayName: string
    aliases: string[]
  }
  configured: boolean
  memberCount: number
  count: number
  members: Array<KeyDirectory['owner']>
  keys: PublicKeyRecord[]
  supportedTypes: SupportedKeyType[]
}

export interface KeyDirectoryRegistry {
  schemaVersion: 3
  configured: boolean
  identityCount: number
  groupCount: number
  keyCount: number
  identities: KeyDirectory[]
  groups: KeyGroup[]
  supportedTypes: SupportedKeyType[]
}

export class InvalidKeySourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidKeySourceError'
  }
}

function decodeBase64(value: string): Uint8Array {
  try {
    const decoded = atob(value)
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
  } catch {
    throw new InvalidKeySourceError('The public key payload is not valid base64.')
  }
}

function readSshString(bytes: Uint8Array): string {
  if (bytes.length < 4) {
    throw new InvalidKeySourceError('The public key payload is truncated.')
  }

  const length = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0)
  if (length === 0 || length > bytes.length - 4) {
    throw new InvalidKeySourceError('The public key payload has an invalid SSH header.')
  }

  return new TextDecoder().decode(bytes.slice(4, 4 + length))
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function fingerprint(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `SHA256:${toBase64(new Uint8Array(digest)).replace(/=+$/, '')}`
}

function parseOptions(prefix: string): string[] {
  if (!prefix) return []

  return FLAG_OPTIONS.filter((option) =>
    new RegExp(`(^|[\\s,])${option}($|[\\s,])`, 'i').test(prefix),
  )
}

function assertSingleLine(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized || /[\r\n]/.test(normalized)) {
    throw new InvalidKeySourceError(`${label} must be a non-empty single-line value.`)
  }
  return normalized
}

function resolveKeyType(input: string) {
  const typeInfo = findSupportedKeyType(input)
  if (!typeInfo) {
    throw new InvalidKeySourceError(`Unsupported key type or abbreviation: ${input}.`)
  }
  return typeInfo
}

function keyConfigToLine(key: PublicKeyConfig, label: string): string {
  const typeInfo = resolveKeyType(key.type)
  const publicKey = assertSingleLine(key.publicKey, `${label} publicKey`)
  const options = key.options ? assertSingleLine(key.options, `${label} options`) : ''
  const comment = key.comment ? assertSingleLine(key.comment, `${label} comment`) : ''
  return [options, typeInfo.type, publicKey, comment].filter(Boolean).join(' ')
}

async function parseLine(line: string, label: string): Promise<PublicKeyRecord> {
  if (new TextEncoder().encode(line).byteLength > 8192) {
    throw new InvalidKeySourceError(`${label} exceeds OpenSSH's 8 KiB line limit.`)
  }

  const match = KEY_PATTERN.exec(line)
  if (!match) {
    throw new InvalidKeySourceError(`${label} is not a supported OpenSSH public key.`)
  }

  const [, , type, payload, rawComment] = match
  const bytes = decodeBase64(payload)
  const embeddedType = readSshString(bytes)
  if (embeddedType !== type) {
    throw new InvalidKeySourceError(
      `${label} declares ${type}, but its payload contains ${embeddedType}.`,
    )
  }

  const keyFingerprint = await fingerprint(bytes)
  const prefix = line.slice(0, match.index).trim()
  const options = parseOptions(prefix)
  const typeInfo = resolveKeyType(type)
  const securityKey = typeInfo.family === 'security-key'

  return {
    id: keyFingerprint.slice('SHA256:'.length, 'SHA256:'.length + 12),
    type,
    typeShortName: typeInfo.shortName,
    typeLabel: typeInfo.label,
    family: typeInfo.family,
    comment: rawComment?.trim() || null,
    fingerprint: keyFingerprint,
    authorizedKey: line,
    options,
    securityKey,
    postQuantum: typeInfo.family === 'post-quantum',
    certificateAuthority: options.includes('cert-authority'),
    restricted:
      options.includes('restrict') ||
      options.some((option) =>
        ['no-agent-forwarding', 'no-port-forwarding', 'no-pty', 'no-user-rc', 'no-X11-forwarding'].includes(option),
      ),
    touchRequired: securityKey && !options.includes('no-touch-required'),
    verificationRequired: options.includes('verify-required'),
  }
}

function validateSlug(value: string, label: string): string {
  if (!SLUG_PATTERN.test(value)) {
    throw new InvalidKeySourceError(
      `${label} must use 1-32 lowercase letters, numbers, hyphens, or underscores.`,
    )
  }
  return value
}

export async function buildDirectory(config: IdentityConfig): Promise<KeyDirectory> {
  const handle = validateSlug(config.handle, 'Identity handle')
  const displayName = assertSingleLine(config.displayName, `Identity ${handle} displayName`)
  const aliases = (config.aliases ?? []).map((alias, index) =>
    validateSlug(alias, `Identity ${handle} alias ${index + 1}`),
  )
  const keys = await Promise.all(
    config.keys.map((key, index) => {
      const label = `Identity ${handle} key ${index + 1}`
      return parseLine(keyConfigToLine(key, label), label)
    }),
  )

  const duplicate = keys.find(
    (key, index) => keys.findIndex((candidate) => candidate.fingerprint === key.fingerprint) !== index,
  )
  if (duplicate) {
    throw new InvalidKeySourceError(`Identity ${handle} has duplicate public key ${duplicate.fingerprint}.`)
  }

  return {
    schemaVersion: 3,
    owner: { handle, displayName, aliases },
    configured: keys.length > 0,
    count: keys.length,
    keys,
    supportedTypes: SUPPORTED_KEY_TYPES.map(({ type, shortName, aliases, label, family }) => ({
      type,
      shortName,
      aliases: [...aliases],
      label,
      family,
    })),
  }
}

function buildGroup(config: GroupConfig, identities: KeyDirectory[]): KeyGroup {
  const handle = validateSlug(config.handle, 'Group handle')
  const displayName = assertSingleLine(config.displayName, `Group ${handle} displayName`)
  const aliases = (config.aliases ?? []).map((alias, index) =>
    validateSlug(alias, `Group ${handle} alias ${index + 1}`),
  )
  const memberDirectories = config.members.map((member, index) => {
    const memberSlug = validateSlug(member, `Group ${handle} member ${index + 1}`)
    const identity = identities.find(
      (candidate) =>
        candidate.owner.handle === memberSlug || candidate.owner.aliases.includes(memberSlug),
    )
    if (!identity) {
      throw new InvalidKeySourceError(
        `Group ${handle} references unknown identity or alias ${memberSlug}.`,
      )
    }
    return identity
  })

  const duplicateMember = memberDirectories.find(
    (member, index) =>
      memberDirectories.findIndex(
        (candidate) => candidate.owner.handle === member.owner.handle,
      ) !== index,
  )
  if (duplicateMember) {
    throw new InvalidKeySourceError(
      `Group ${handle} includes identity ${duplicateMember.owner.handle} more than once.`,
    )
  }

  const fingerprints = new Set<string>()
  const keys = memberDirectories.flatMap((member) =>
    member.keys.filter((key) => {
      if (fingerprints.has(key.fingerprint)) return false
      fingerprints.add(key.fingerprint)
      return true
    }),
  )

  return {
    schemaVersion: 3,
    group: { handle, displayName, aliases },
    configured: keys.length > 0,
    memberCount: memberDirectories.length,
    count: keys.length,
    members: memberDirectories.map((member) => member.owner),
    keys,
    supportedTypes: identities[0].supportedTypes,
  }
}

export async function buildDirectoryRegistry(config: DirectoryRegistryConfig): Promise<KeyDirectoryRegistry> {
  if (config.identities.length === 0) {
    throw new InvalidKeySourceError('Configure at least one identity.')
  }

  const identities = await Promise.all(config.identities.map(buildDirectory))
  const claimedSlugs = new Map<string, string>()
  for (const identity of identities) {
    const identityHandle = identity.owner.handle
    for (const slug of [identityHandle, ...identity.owner.aliases]) {
      const owner = claimedSlugs.get(slug)
      if (owner) {
        throw new InvalidKeySourceError(`Route alias ${slug} is claimed by both ${owner} and ${identityHandle}.`)
      }
      claimedSlugs.set(slug, identityHandle)
    }
  }

  const groupSlugs = new Map<string, string>()
  const groups = (config.groups ?? []).map((groupConfig) => {
    const group = buildGroup(groupConfig, identities)
    for (const slug of [group.group.handle, ...group.group.aliases]) {
      const owner = groupSlugs.get(slug)
      if (owner) {
        throw new InvalidKeySourceError(
          `Group route alias ${slug} is claimed by both ${owner} and ${group.group.handle}.`,
        )
      }
      groupSlugs.set(slug, group.group.handle)
    }
    return group
  })

  return {
    schemaVersion: 3,
    configured:
      identities.every((identity) => identity.configured) &&
      groups.every((group) => group.configured),
    identityCount: identities.length,
    groupCount: groups.length,
    keyCount: identities.reduce((total, identity) => total + identity.count, 0),
    identities,
    groups,
    supportedTypes: identities[0].supportedTypes,
  }
}

export function findDirectory(registry: KeyDirectoryRegistry, slug: string): KeyDirectory | undefined {
  return registry.identities.find(
    (identity) => identity.owner.handle === slug || identity.owner.aliases.includes(slug),
  )
}

export function findGroup(registry: KeyDirectoryRegistry, slug: string): KeyGroup | undefined {
  return registry.groups.find(
    (group) => group.group.handle === slug || group.group.aliases.includes(slug),
  )
}

export async function createEtag(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  return `"${toBase64(new Uint8Array(digest)).replace(/=+$/, '')}"`
}
