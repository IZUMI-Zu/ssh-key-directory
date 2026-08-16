export type KeyFamily = 'ed25519' | 'ecdsa' | 'security-key' | 'post-quantum' | 'rsa'

export interface SupportedKeyType {
  type: string
  shortName: string
  aliases: readonly string[]
  label: string
  family: KeyFamily
}

export const SUPPORTED_KEY_TYPES = [
  {
    type: 'ssh-ed25519',
    shortName: 'ed25519',
    aliases: ['ed'],
    label: 'Ed25519',
    family: 'ed25519',
  },
  {
    type: 'sk-ssh-ed25519@openssh.com',
    shortName: 'ed25519-sk',
    aliases: ['sk-ed25519', 'ed-sk'],
    label: 'Ed25519 security key',
    family: 'security-key',
  },
  {
    type: 'ecdsa-sha2-nistp256',
    shortName: 'ecdsa-p256',
    aliases: ['ecdsa', 'p256'],
    label: 'ECDSA P-256',
    family: 'ecdsa',
  },
  {
    type: 'ecdsa-sha2-nistp384',
    shortName: 'ecdsa-p384',
    aliases: ['p384'],
    label: 'ECDSA P-384',
    family: 'ecdsa',
  },
  {
    type: 'ecdsa-sha2-nistp521',
    shortName: 'ecdsa-p521',
    aliases: ['p521'],
    label: 'ECDSA P-521',
    family: 'ecdsa',
  },
  {
    type: 'sk-ecdsa-sha2-nistp256@openssh.com',
    shortName: 'ecdsa-sk',
    aliases: ['sk-ecdsa', 'p256-sk'],
    label: 'ECDSA P-256 security key',
    family: 'security-key',
  },
  {
    type: 'ssh-mldsa44-ed25519@openssh.com',
    shortName: 'pq',
    aliases: ['mldsa44', 'ml-dsa'],
    label: 'ML-DSA-44 + Ed25519',
    family: 'post-quantum',
  },
  {
    type: 'ssh-rsa',
    shortName: 'rsa',
    aliases: ['rsa-key'],
    label: 'RSA',
    family: 'rsa',
  },
] as const satisfies readonly SupportedKeyType[]

export type CanonicalKeyType = (typeof SUPPORTED_KEY_TYPES)[number]['type']
export type KeyTypeShortName = (typeof SUPPORTED_KEY_TYPES)[number]['shortName']
export type KeyTypeAlias = (typeof SUPPORTED_KEY_TYPES)[number]['aliases'][number]
export type KeyTypeInput = CanonicalKeyType | KeyTypeShortName | KeyTypeAlias

export function findSupportedKeyType(input: string): SupportedKeyType | undefined {
  const normalized = input.trim().toLowerCase()
  return SUPPORTED_KEY_TYPES.find(
    (candidate) =>
      candidate.type === normalized ||
      candidate.shortName === normalized ||
      candidate.aliases.some((alias) => alias === normalized),
  )
}
