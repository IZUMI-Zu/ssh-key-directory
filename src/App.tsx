import { useEffect, useMemo, useState } from 'react'
import { EndpointsSection } from './components/EndpointsSection.tsx'
import { GroupsSection } from './components/GroupsSection.tsx'
import { HeroSection } from './components/HeroSection.tsx'
import { IdentitiesSection } from './components/IdentitiesSection.tsx'
import { SiteFooter } from './components/SiteFooter.tsx'
import { SiteHeader } from './components/SiteHeader.tsx'
import { SummarySection } from './components/SummarySection.tsx'
import {
  isDirectoryIndex,
  isDirectoryResponse,
  legacyToIndex,
  type DirectoryIndexResponse,
} from './directory.ts'
import { SUPPORTED_KEY_TYPES } from './key-types.ts'

const DIRECTORY_API_URL = '/api/v1/directory?schema=3'

function App() {
  const [registry, setRegistry] = useState<DirectoryIndexResponse | null>(null)
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDirectory() {
      try {
        const response = await fetch(DIRECTORY_API_URL, { signal: controller.signal })
        if (!response.ok) throw new Error(`Directory API returned ${response.status}`)
        const payload: unknown = await response.json()
        const nextRegistry = isDirectoryIndex(payload)
          ? payload
          : isDirectoryResponse(payload)
            ? legacyToIndex(payload)
            : null
        if (!nextRegistry) throw new Error('Directory API returned an invalid payload')
        if (nextRegistry.identities.length === 0) throw new Error('Directory contains no identities')
        setRegistry(nextRegistry)
        setSelectedHandle((current) => current ?? nextRegistry.identities[0].owner.handle)
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Could not load the key directory')
      }
    }

    void loadDirectory()
    return () => controller.abort()
  }, [])

  const directory = useMemo(
    () => registry?.identities.find((identity) => identity.owner.handle === selectedHandle)
      ?? registry?.identities[0]
      ?? null,
    [registry, selectedHandle],
  )
  const supportedTypes = registry?.supportedTypes ?? directory?.supportedTypes ?? SUPPORTED_KEY_TYPES
  const groups = registry?.groups ?? []
  const primaryGroup = groups[0]
  const origin = window.location.origin
  const host = window.location.host || 'ssh-key-directory'
  const handle = directory?.owner.handle ?? 'example'
  const keysUrl = directory?.endpoints.authorizedKeys ?? `${origin}/${handle}.keys`
  const installCommand = `curl -fsSL ${keysUrl} >> ~/.ssh/authorized_keys`
  const hardwareKeyCount = registry?.identities.reduce(
    (total, identity) => total + identity.keys.filter((key) => key.securityKey).length,
    0,
  ) ?? 0
  const statusLabel = useMemo(() => {
    if (error) return 'API unavailable'
    if (!directory) return 'Checking'
    return directory.configured ? `${directory.count} active` : 'Setup required'
  }, [directory, error])
  const endpointRows: Array<[string, string]> = [
    [`/${handle}.keys`, 'OpenSSH authorized_keys'],
    [`/${handle}.keys?type=${directory?.keys[0]?.typeShortName ?? 'ed25519'}`, 'Filter by key type or alias'],
    [`/${handle}.json`, 'Selected identity metadata'],
    ...(primaryGroup
      ? [[`/groups/${primaryGroup.group.handle}.keys`, 'Aggregated group authorized_keys'] as [string, string]]
      : []),
    ['/api/v1/directory', 'All identities, groups, and keys'],
    ['/fingerprints.json', 'Combined fingerprint manifest'],
    ['/healthz', 'Deployment readiness'],
  ]

  return (
    <div className="min-h-screen bg-base color-base font-sans antialiased">
      <SiteHeader host={host} dark={dark} onToggleTheme={() => setDark((value) => !value)} />

      <main className="page-shell">
        <HeroSection directory={directory} handle={handle} installCommand={installCommand} />

        <SummarySection
          registry={registry}
          hardwareKeyCount={hardwareKeyCount}
          supportedTypeCount={supportedTypes.length}
        />

        <IdentitiesSection
          handle={handle}
          directory={directory}
          registry={registry}
          error={error}
          statusLabel={statusLabel}
          onSelectIdentity={setSelectedHandle}
        />
        <GroupsSection registry={registry} groups={groups} origin={origin} />
        <EndpointsSection endpointRows={endpointRows} supportedTypes={supportedTypes} />
      </main>

      <SiteFooter />
    </div>
  )
}

export default App
