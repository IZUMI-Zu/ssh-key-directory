import directoryConfig from '../keys/directory.config.ts'
import {
  buildDirectoryRegistry,
  createEtag,
  findDirectory,
  findGroup,
  findSupportedKeyType,
  InvalidKeySourceError,
  type KeyDirectory,
  type DirectoryRegistryConfig,
  type KeyGroup,
  type KeyDirectoryRegistry,
  type SupportedKeyType,
} from './key-directory.ts'

const CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
const PUBLIC_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': CACHE_CONTROL,
  'X-Content-Type-Options': 'nosniff',
}

function withEndpoints(
  directory: KeyDirectory,
  origin: string,
  keyType: SupportedKeyType | null = null,
) {
  const base = `${origin}/${directory.owner.handle}`
  const query = keyType ? `?type=${encodeURIComponent(keyType.shortName)}` : ''
  return {
    ...directory,
    endpoints: {
      authorizedKeys: `${base}.keys${query}`,
      metadata: `${base}.json${query}`,
      fingerprints: `${origin}/fingerprints.json`,
    },
  }
}

function withRegistryEndpoints(registry: KeyDirectoryRegistry, origin: string) {
  return {
    ...registry,
    identities: registry.identities.map((identity) => withEndpoints(identity, origin)),
    groups: registry.groups.map((group) => withGroupEndpoints(group, origin)),
  }
}

function withGroupEndpoints(
  group: KeyGroup,
  origin: string,
  keyType: SupportedKeyType | null = null,
) {
  const base = `${origin}/groups/${group.group.handle}`
  const query = keyType ? `?type=${encodeURIComponent(keyType.shortName)}` : ''
  return {
    ...group,
    endpoints: {
      authorizedKeys: `${base}.keys${query}`,
      metadata: `${base}.json${query}`,
      api: `${origin}/api/v1/groups/${group.group.handle}${query}`,
    },
  }
}

async function bodyResponse(
  request: Request,
  body: string,
  init: ResponseInit & { headers?: HeadersInit } = {},
) {
  const headers = new Headers(PUBLIC_HEADERS)
  new Headers(init.headers).forEach((value, key) => headers.set(key, value))
  const etag = await createEtag(body)
  headers.set('ETag', etag)

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers })
  }

  return new Response(request.method === 'HEAD' ? null : body, {
    ...init,
    headers,
  })
}

function problem(status: number, title: string, detail: string) {
  return Response.json(
    { type: 'about:blank', title, status, detail },
    {
      status,
      headers: {
        ...PUBLIC_HEADERS,
        'Cache-Control': 'no-store',
        'Content-Type': 'application/problem+json; charset=utf-8',
      },
    },
  )
}

function identitySlugFromPath(pathname: string, suffix: '.keys' | '.json' | ''): string | null {
  if (suffix && !pathname.endsWith(suffix)) return null
  const value = pathname.slice(1, suffix ? -suffix.length : undefined)
  return value && !value.includes('/') && !value.includes('.') ? value.toLowerCase() : null
}

function groupSlugFromPath(pathname: string, suffix: '.keys' | '.json'): string | null {
  const prefix = '/groups/'
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null
  const value = pathname.slice(prefix.length, -suffix.length)
  return value && !value.includes('/') && !value.includes('.') ? value.toLowerCase() : null
}

type KeyTypeQuery =
  | { ok: true; keyType: SupportedKeyType | null }
  | { ok: false; response: Response }

function keyTypeFromUrl(url: URL): KeyTypeQuery {
  const values = url.searchParams.getAll('type')
  if (values.length === 0) return { ok: true, keyType: null }
  if (values.length !== 1 || !values[0].trim()) {
    return {
      ok: false,
      response: problem(400, 'Invalid key type', 'Provide exactly one non-empty type query value.'),
    }
  }

  const keyType = findSupportedKeyType(values[0])
  if (!keyType) {
    return {
      ok: false,
      response: problem(
        400,
        'Unsupported key type',
        `No key type or alias is registered as ${values[0]}.`,
      ),
    }
  }

  return { ok: true, keyType }
}

async function identityResponse(
  request: Request,
  directory: KeyDirectory,
  origin: string,
  format: 'keys' | 'json',
  keyType: SupportedKeyType | null,
) {
  const keys = keyType
    ? directory.keys.filter((key) => key.type === keyType.type)
    : directory.keys

  if (keyType && keys.length === 0) {
    return problem(
      404,
      'Key type not found',
      `${directory.owner.handle} has no ${keyType.shortName} public key.`,
    )
  }

  const selectedDirectory = {
    ...directory,
    configured: keys.length > 0,
    count: keys.length,
    keys,
  }

  if (format === 'keys') {
    if (!selectedDirectory.configured) {
      return problem(
        503,
        'No public keys configured',
        `Add at least one public key for ${directory.owner.handle} in keys/directory.config.ts.`,
      )
    }

    const body = `${selectedDirectory.keys.map((key) => key.authorizedKey).join('\n')}\n`
    return bodyResponse(request, body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${directory.owner.handle}${keyType ? `.${keyType.shortName}` : ''}.keys"`,
        ...(keyType ? { 'X-Key-Type': keyType.shortName } : {}),
      },
    })
  }

  const body = `${JSON.stringify(withEndpoints(selectedDirectory, origin, keyType), null, 2)}\n`
  return bodyResponse(request, body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function groupResponse(
  request: Request,
  group: KeyGroup,
  origin: string,
  format: 'keys' | 'json',
  keyType: SupportedKeyType | null,
) {
  const keys = keyType
    ? group.keys.filter((key) => key.type === keyType.type)
    : group.keys

  if (keyType && keys.length === 0) {
    return problem(
      404,
      'Key type not found',
      `${group.group.handle} has no ${keyType.shortName} public key.`,
    )
  }

  const selectedGroup = {
    ...group,
    configured: keys.length > 0,
    count: keys.length,
    keys,
  }

  if (format === 'keys') {
    if (!selectedGroup.configured) {
      return problem(
        503,
        'No public keys configured',
        `Add at least one identity with a public key to group ${group.group.handle}.`,
      )
    }

    const body = `${selectedGroup.keys.map((key) => key.authorizedKey).join('\n')}\n`
    return bodyResponse(request, body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${group.group.handle}${keyType ? `.${keyType.shortName}` : ''}.keys"`,
        ...(keyType ? { 'X-Key-Type': keyType.shortName } : {}),
        'X-Key-Group': group.group.handle,
      },
    })
  }

  const body = `${JSON.stringify(withGroupEndpoints(selectedGroup, origin, keyType), null, 2)}\n`
  return bodyResponse(request, body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function route(
  request: Request,
  registryPromise: Promise<KeyDirectoryRegistry>,
): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...PUBLIC_HEADERS,
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'If-None-Match',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return problem(405, 'Method not allowed', 'Use GET or HEAD for this public directory.')
  }

  const registry = await registryPromise

  if (pathname === '/healthz') {
    return Response.json(
      {
        ok: registry.configured,
        configured: registry.configured,
        identityCount: registry.identityCount,
        groupCount: registry.groupCount,
        keyCount: registry.keyCount,
      },
      {
        status: registry.configured ? 200 : 503,
        headers: { ...PUBLIC_HEADERS, 'Cache-Control': 'no-store' },
      },
    )
  }

  if (pathname === '/api/v1/directory') {
    const body = `${JSON.stringify(withRegistryEndpoints(registry, url.origin), null, 2)}\n`
    return bodyResponse(request, body, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  if (pathname === '/fingerprints.json') {
    const body = `${JSON.stringify(
      {
        schemaVersion: registry.schemaVersion,
        identityCount: registry.identityCount,
        groupCount: registry.groupCount,
        keyCount: registry.keyCount,
        identities: registry.identities.map((identity) => ({
          owner: identity.owner,
          count: identity.count,
          fingerprints: identity.keys.map(({
            id,
            type,
            typeShortName,
            typeLabel,
            family,
            comment,
            fingerprint,
            securityKey,
            postQuantum,
          }) => ({
            id,
            type,
            typeShortName,
            typeLabel,
            family,
            comment,
            fingerprint,
            securityKey,
            postQuantum,
          })),
        })),
      },
      null,
      2,
    )}\n`
    return bodyResponse(request, body, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  if (pathname === '/api/v1/groups') {
    const body = `${JSON.stringify(
      {
        schemaVersion: registry.schemaVersion,
        groupCount: registry.groupCount,
        groups: registry.groups.map((group) => withGroupEndpoints(group, url.origin)),
      },
      null,
      2,
    )}\n`
    return bodyResponse(request, body, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  if (pathname.startsWith('/api/v1/groups/')) {
    const slug = pathname.slice('/api/v1/groups/'.length).toLowerCase()
    const group = findGroup(registry, slug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    return group
      ? groupResponse(request, group, url.origin, 'json', keyTypeQuery.keyType)
      : problem(404, 'Group not found', `No group or group alias is registered as ${slug}.`)
  }

  if (pathname.startsWith('/api/v1/identities/')) {
    const slug = pathname.slice('/api/v1/identities/'.length).toLowerCase()
    const directory = findDirectory(registry, slug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    return directory
      ? identityResponse(request, directory, url.origin, 'json', keyTypeQuery.keyType)
      : problem(404, 'Identity not found', `No identity or alias is registered as ${slug}.`)
  }

  const groupKeysSlug = groupSlugFromPath(pathname, '.keys')
  if (groupKeysSlug) {
    const group = findGroup(registry, groupKeysSlug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    return group
      ? groupResponse(request, group, url.origin, 'keys', keyTypeQuery.keyType)
      : problem(404, 'Group not found', `No group or group alias is registered as ${groupKeysSlug}.`)
  }

  const groupJsonSlug = groupSlugFromPath(pathname, '.json')
  if (groupJsonSlug) {
    const group = findGroup(registry, groupJsonSlug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    return group
      ? groupResponse(request, group, url.origin, 'json', keyTypeQuery.keyType)
      : problem(404, 'Group not found', `No group or group alias is registered as ${groupJsonSlug}.`)
  }

  const keysSlug = identitySlugFromPath(pathname, '.keys')
  if (keysSlug) {
    const directory = findDirectory(registry, keysSlug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    return directory
      ? identityResponse(request, directory, url.origin, 'keys', keyTypeQuery.keyType)
      : problem(404, 'Identity not found', `No identity or alias is registered as ${keysSlug}.`)
  }

  const jsonSlug = identitySlugFromPath(pathname, '.json')
  if (jsonSlug) {
    const directory = findDirectory(registry, jsonSlug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    return directory
      ? identityResponse(request, directory, url.origin, 'json', keyTypeQuery.keyType)
      : problem(404, 'Identity not found', `No identity or alias is registered as ${jsonSlug}.`)
  }

  const bareSlug = identitySlugFromPath(pathname, '')
  if (bareSlug) {
    const directory = findDirectory(registry, bareSlug)
    const keyTypeQuery = keyTypeFromUrl(url)
    if (!keyTypeQuery.ok) return keyTypeQuery.response
    if (directory) {
      return identityResponse(request, directory, url.origin, 'keys', keyTypeQuery.keyType)
    }
  }

  if (pathname.startsWith('/api/')) {
    return problem(404, 'Not found', `No API endpoint exists at ${pathname}.`)
  }

  return problem(404, 'Not found', `No key directory endpoint exists at ${pathname}.`)
}

export function createWorker(config: DirectoryRegistryConfig): ExportedHandler<Env> {
  const registryPromise = buildDirectoryRegistry(config)

  return {
    async fetch(request: Request): Promise<Response> {
      try {
        return await route(request, registryPromise)
      } catch (error) {
        const detail =
          error instanceof InvalidKeySourceError
            ? error.message
            : 'The key directory could not be generated.'
        console.error(JSON.stringify({ message: 'key directory request failed', detail }))
        return problem(500, 'Invalid key directory', detail)
      }
    },
  }
}

export default createWorker(directoryConfig)
