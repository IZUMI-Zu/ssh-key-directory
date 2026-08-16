import type { KeyFamily, SupportedKeyType } from './key-types.ts'

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
export interface DirectoryResponse {
  owner: {
    handle: string
    displayName: string
    aliases: string[]
  }
  configured: boolean
  count: number
  keys: PublicKeyRecord[]
  supportedTypes?: SupportedKeyType[]
  endpoints: {
    authorizedKeys: string
    metadata: string
    fingerprints: string
  }
}

export interface GroupResponse {
  group: {
    handle: string
    displayName: string
    aliases: string[]
  }
  configured: boolean
  memberCount: number
  count: number
  members: DirectoryResponse['owner'][]
  keys: PublicKeyRecord[]
  endpoints: {
    authorizedKeys: string
    metadata: string
    api: string
  }
}

export interface DirectoryIndexResponse {
  schemaVersion: number
  configured: boolean
  identityCount: number
  groupCount?: number
  keyCount: number
  identities: DirectoryResponse[]
  groups?: GroupResponse[]
  supportedTypes?: SupportedKeyType[]
}

export function isDirectoryIndex(value: unknown): value is DirectoryIndexResponse {
  if (!value || typeof value !== 'object') return false
  return Array.isArray((value as { identities?: unknown }).identities)
}

export function isDirectoryResponse(value: unknown): value is DirectoryResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { owner?: unknown; keys?: unknown }
  return !!candidate.owner && typeof candidate.owner === 'object' && Array.isArray(candidate.keys)
}

export function legacyToIndex(directory: DirectoryResponse): DirectoryIndexResponse {
  return {
    schemaVersion: 1,
    configured: directory.configured,
    identityCount: 1,
    groupCount: 0,
    keyCount: directory.count,
    identities: [{
      ...directory,
      owner: {
        ...directory.owner,
        aliases: directory.owner.aliases ?? [],
      },
    }],
    groups: [],
    supportedTypes: directory.supportedTypes,
  }
}
