import { useEffect, useMemo, useState } from 'react'
import { SUPPORTED_KEY_TYPES, type KeyFamily, type SupportedKeyType } from './key-types.ts'

const DIRECTORY_API_URL = '/api/v1/directory?schema=3'

interface PublicKeyRecord {
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

interface DirectoryResponse {
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

interface GroupResponse {
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

interface DirectoryIndexResponse {
  schemaVersion: number
  configured: boolean
  identityCount: number
  groupCount?: number
  keyCount: number
  identities: DirectoryResponse[]
  groups?: GroupResponse[]
  supportedTypes?: SupportedKeyType[]
}

function isDirectoryIndex(value: unknown): value is DirectoryIndexResponse {
  if (!value || typeof value !== 'object') return false
  return Array.isArray((value as { identities?: unknown }).identities)
}

function isDirectoryResponse(value: unknown): value is DirectoryResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { owner?: unknown; keys?: unknown }
  return !!candidate.owner && typeof candidate.owner === 'object' && Array.isArray(candidate.keys)
}

function legacyToIndex(directory: DirectoryResponse): DirectoryIndexResponse {
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

function CopyButton({
  value,
  label = 'Copy',
  compact = false,
}: {
  value: string
  label?: string
  compact?: boolean
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      setState(copied ? 'copied' : 'failed')
    }

    window.setTimeout(() => setState('idle'), 1600)
  }

  const text = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label

  return (
    <button
      className={compact ? 'btn-icon shrink-0' : 'btn-action shrink-0'}
      type="button"
      onClick={copy}
      aria-label={compact ? text : undefined}
      title={compact ? text : undefined}
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={
          state === 'copied'
            ? 'i-ph-check-bold text-sm color-active'
            : state === 'failed'
              ? 'i-ph-warning-circle-bold text-sm text-red-600 dark:text-red-400'
              : 'i-ph-copy-duotone text-sm'
        }
      />
      {!compact && <span>{text}</span>}
    </button>
  )
}

function KeyIcon({ keyRecord }: { keyRecord: PublicKeyRecord }) {
  if (keyRecord.certificateAuthority) {
    return <span className="i-ph-certificate-duotone text-lg color-active" aria-hidden="true" />
  }
  if (keyRecord.securityKey) {
    return <span className="i-ph-fingerprint-simple-duotone text-lg color-active" aria-hidden="true" />
  }
  if (keyRecord.postQuantum) {
    return <span className="i-ph-cpu-duotone text-lg color-active" aria-hidden="true" />
  }
  return <span className="i-ph-key-duotone text-lg color-secondary" aria-hidden="true" />
}

function SiteHeader({
  host,
  dark,
  onToggleTheme,
}: {
  host: string
  dark: boolean
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-top-nav border-b border-base bg-nav backdrop-blur-xl">
      <div className="page-shell flex h-14 items-center gap-3">
        <a className="flex min-w-0 items-center gap-2.5 color-base no-underline" href="/">
          <img className="size-8 shrink-0" src="/favicon.svg?v=20260816" alt="" aria-hidden="true" />
          <span className="truncate font-mono text-xs font-500" title={host}>
            {host}
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Primary navigation">
          <a className="btn-icon w-auto px-3 no-underline" href="#identities">Identities</a>
          <a className="btn-icon w-auto px-3 no-underline" href="#groups">Groups</a>
          <a className="btn-icon w-auto px-3 no-underline" href="#endpoints">Endpoints</a>
          <a
            className="btn-icon w-auto px-3 no-underline"
            href="/fingerprints.json"
            target="_blank"
            rel="noreferrer"
          >
            Manifest
            <span className="i-ph-arrow-up-right text-xs" aria-hidden="true" />
          </a>
        </nav>

        <button
          type="button"
          className="btn-icon ml-auto sm:ml-1"
          onClick={onToggleTheme}
          aria-label={dark ? 'Use light theme' : 'Use dark theme'}
          title={dark ? 'Use light theme' : 'Use dark theme'}
        >
          <span
            className={dark ? 'i-ph-sun-duotone text-base' : 'i-ph-moon-stars-duotone text-base'}
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  )
}

function HeroSection({
  directory,
  handle,
  installCommand,
}: {
  directory: DirectoryResponse | null
  handle: string
  installCommand: string
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-10 border-b border-base py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(25rem,0.75fr)] lg:items-end lg:py-20">
      <div className="min-w-0 max-w-3xl">
        <p className="tech-label mb-4">SSH public key directory</p>
        <h1 className="m-0 text-balance text-4xl font-650 leading-[1.08] tracking-[-0.045em] color-base sm:text-5xl">
          Public keys for every operator.
        </h1>
        <p className="mt-5 max-w-[66ch] text-pretty text-base leading-7 color-secondary">
          A versioned directory for provisioning SSH identities across a team. Each person gets
          a canonical endpoint, optional aliases, group bundles, and machine-readable key metadata.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <a className="btn-action no-underline" href="#identities">
            <span className="i-ph-users-three-duotone text-base" aria-hidden="true" />
            Browse identities
          </a>
          <a
            className="btn-action no-underline"
            href="/api/v1/directory"
            target="_blank"
            rel="noreferrer"
          >
            <span className="i-ph-brackets-curly-duotone text-base" aria-hidden="true" />
            Directory API
          </a>
        </div>
      </div>

      <div className="surface-panel min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-sm font-650 color-base">
              <span className="i-ph-terminal-window-duotone text-base color-active" aria-hidden="true" />
              Provision {directory?.owner.displayName ?? 'an identity'}
            </p>
            <p className="mt-1.5 truncate text-xs leading-5 color-muted" title={`/${handle}.keys`}>
              Selected endpoint: /{handle}.keys
            </p>
          </div>
          <CopyButton value={installCommand} compact />
        </div>
        <div className="code-block overflow-x-auto whitespace-nowrap" title={installCommand}>
          <span className="select-none color-active">$ </span>{installCommand}
        </div>
        {!directory?.configured && (
          <p className="mb-0 mt-3 flex items-start gap-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
            <span className="i-ph-warning-circle-duotone mt-0.5 shrink-0 text-sm" aria-hidden="true" />
            Provisioning stays disabled until this identity has a valid public key.
          </p>
        )}
      </div>
    </section>
  )
}

function SummarySection({
  registry,
  hardwareKeyCount,
  supportedTypeCount,
}: {
  registry: DirectoryIndexResponse | null
  hardwareKeyCount: number
  supportedTypeCount: number
}) {
  return (
    <section className="grid grid-cols-2 border-b border-base lg:grid-cols-4" aria-label="Directory summary">
      <div className="border-b border-base py-5 pr-3 lg:border-b-0 sm:py-6">
        <p className="tech-label m-0">Identities</p>
        <p className="mb-0 mt-2 font-mono text-xl tabular-nums color-base sm:text-2xl">
          {registry?.identityCount ?? 0}
        </p>
      </div>
      <div className="border-b border-l border-base px-3 py-5 lg:border-b-0 sm:px-6 sm:py-6">
        <p className="tech-label m-0">Active keys</p>
        <p className="mb-0 mt-2 font-mono text-xl tabular-nums color-base sm:text-2xl">
          {registry?.keyCount ?? 0}
        </p>
      </div>
      <div className="border-base py-5 pr-3 lg:border-l lg:px-6 sm:py-6">
        <p className="tech-label m-0">Hardware backed</p>
        <p className="mb-0 mt-2 font-mono text-xl tabular-nums color-base sm:text-2xl">
          {hardwareKeyCount}
        </p>
      </div>
      <div className="border-l border-base py-5 pl-3 sm:py-6 sm:pl-6">
        <p className="tech-label m-0">Key types</p>
        <p className="mb-0 mt-2 font-mono text-xl tabular-nums color-base sm:text-2xl">
          {supportedTypeCount}
        </p>
      </div>
    </section>
  )
}

function IdentitiesSection({
  handle,
  directory,
  registry,
  error,
  statusLabel,
  onSelectIdentity,
}: {
  handle: string
  directory: DirectoryResponse | null
  registry: DirectoryIndexResponse | null
  error: string | null
  statusLabel: string
  onSelectIdentity: (handle: string) => void
}) {
  return (
    <section className="py-14 sm:py-18" id="identities">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tech-label mb-2">Directory / {handle}</p>
          <h2 className="section-title m-0">Authorized identities</h2>
        </div>
        <span
          className={
            directory?.configured
              ? 'status-badge border-active bg-active color-active'
              : 'status-badge border-strong bg-secondary color-secondary'
          }
        >
          <span
            className={directory?.configured ? 'i-ph-check-circle-fill text-xs' : 'i-ph-circle-dashed text-xs'}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>

      {error ? (
        <div className="surface-panel flex gap-3 p-5 text-red-700 dark:text-red-300">
          <span className="i-ph-warning-circle-duotone mt-0.5 shrink-0 text-lg" aria-hidden="true" />
          <div>
            <p className="m-0 text-sm font-650">The directory API is unavailable.</p>
            <p className="mb-0 mt-1 text-xs leading-5 opacity-75">{error}. Check the Worker route and try again.</p>
          </div>
        </div>
      ) : !registry || !directory ? (
        <div className="h-36 animate-pulse rounded-xl bg-secondary" aria-label="Loading public keys" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="surface-panel h-fit overflow-hidden" aria-label="Identity selector">
            {registry.identities.map((identity) => {
              const selected = identity.owner.handle === directory.owner.handle
              const currentIdentity = selected ? { 'aria-current': 'true' as const } : {}
              return (
                <button
                  className={`surface-row grid min-h-18 w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-[color,background-color] duration-150 ${selected ? 'bg-active color-active' : 'bg-elevated color-base hover:bg-secondary'}`}
                  key={identity.owner.handle}
                  type="button"
                  onClick={() => onSelectIdentity(identity.owner.handle)}
                  {...currentIdentity}
                >
                  <span className="grid size-10 place-items-center rounded-lg border border-strong bg-secondary">
                    <span className="i-ph-user-duotone text-base" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-650" title={identity.owner.displayName}>
                      {identity.owner.displayName}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[0.6875rem] color-muted" title={`/${identity.owner.handle}.keys`}>
                      /{identity.owner.handle}.keys
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums color-muted">{identity.count}</span>
                </button>
              )
            })}
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
              <span className="text-xs color-secondary">Aliases</span>
              {directory.owner.aliases.length ? directory.owner.aliases.map((alias) => (
                <a
                  className="status-badge border-strong bg-secondary color-secondary no-underline hover:border-active hover:color-active"
                  href={`/${alias}.keys`}
                  key={alias}
                  target="_blank"
                  rel="noreferrer"
                >
                  /{alias}.keys
                </a>
              )) : <span className="font-mono text-xs color-muted">none</span>}
            </div>

            {directory.keys.length === 0 ? (
              <div className="surface-panel grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                <span className="grid size-10 place-items-center rounded-lg border border-strong bg-secondary">
                  <span className="i-ph-plus-duotone text-lg color-secondary" aria-hidden="true" />
                </span>
                <div>
                  <p className="m-0 text-sm font-650 color-base">Add the first public key</p>
                  <p className="mb-0 mt-1.5 max-w-[65ch] text-sm leading-6 color-secondary">
                    Add a key object for this identity in{' '}
                    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">keys/directory.config.ts</code>.
                  </p>
                </div>
                <CopyButton value="keys/directory.config.ts" label="Copy path" />
              </div>
            ) : (
              <div className="surface-panel overflow-hidden">
                {directory.keys.map((key) => (
                  <article className="surface-row grid gap-4 p-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:p-5" key={key.fingerprint}>
                    <span className="grid size-10 place-items-center rounded-lg bg-secondary">
                      <KeyIcon keyRecord={key} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="m-0 truncate text-sm font-650 color-base" title={key.comment ?? key.typeLabel}>
                          {key.comment || key.typeLabel}
                        </h3>
                        <span className="status-badge border-strong bg-secondary color-secondary">{key.typeShortName}</span>
                        {key.securityKey && (
                          <span className="status-badge border-active bg-active color-active">Security key</span>
                        )}
                        {key.postQuantum && (
                          <span className="status-badge border-active bg-active color-active">Hybrid PQ</span>
                        )}
                        {key.certificateAuthority && (
                          <span className="status-badge border-active bg-active color-active">Certificate authority</span>
                        )}
                        {key.restricted && (
                          <span className="status-badge border-strong bg-secondary color-secondary">Restricted</span>
                        )}
                      </div>
                      <p className="mb-0 mt-2 truncate font-mono text-xs tabular-nums color-secondary" title={key.fingerprint}>
                        {key.fingerprint}
                      </p>
                      <p className="mb-0 mt-1 truncate font-mono text-[0.6875rem] color-muted" title={key.type}>
                        {key.type}
                      </p>
                    </div>
                    <CopyButton value={key.authorizedKey} compact />
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function GroupsSection({
  registry,
  groups,
  origin,
}: {
  registry: DirectoryIndexResponse | null
  groups: GroupResponse[]
  origin: string
}) {
  return (
    <section className="border-t border-base py-14 sm:py-18" id="groups">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tech-label mb-2">Provisioning bundles</p>
          <h2 className="section-title m-0">Groups</h2>
          <p className="mb-0 mt-3 max-w-[62ch] text-sm leading-6 color-secondary">
            Combine multiple identities into one deduplicated authorized_keys endpoint. Group
            aliases and key-type filters resolve through the same stable interface.
          </p>
        </div>
        <span className="status-badge border-strong bg-secondary color-secondary">
          <span className="i-ph-users-three-duotone text-xs" aria-hidden="true" />
          {registry?.groupCount ?? groups.length} configured
        </span>
      </div>

      {!registry ? (
        <div className="h-36 animate-pulse rounded-xl bg-secondary" aria-label="Loading groups" />
      ) : groups.length === 0 ? (
        <div className="surface-panel grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
          <span className="grid size-10 place-items-center rounded-lg border border-strong bg-secondary">
            <span className="i-ph-users-three-duotone text-lg color-secondary" aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 text-sm font-650 color-base">No groups configured</p>
            <p className="mb-0 mt-1.5 max-w-[65ch] text-sm leading-6 color-secondary">
              Add a group with a handle, optional aliases, and identity members in{' '}
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">keys/directory.config.ts</code>.
            </p>
          </div>
          <CopyButton value="keys/directory.config.ts" label="Copy path" />
        </div>
      ) : (
        <div className={groups.length === 1 ? 'grid gap-5' : 'grid gap-5 lg:grid-cols-2'}>
          {groups.map((group) => {
            const aliases = group.group.aliases ?? []
            const groupPath = `/groups/${group.group.handle}.keys`
            const groupCommand = `curl -fsSL ${origin}${groupPath}`
            return (
              <article className="surface-panel min-w-0 overflow-hidden" key={group.group.handle}>
                <header className="flex items-start gap-3 border-b border-base p-4 sm:p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-active color-active">
                    <span className="i-ph-users-three-duotone text-lg" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-sm font-650 color-base" title={group.group.displayName}>
                      {group.group.displayName}
                    </h3>
                    <code className="mt-1 block truncate font-mono text-[0.6875rem] color-muted" title={groupPath}>
                      {groupPath}
                    </code>
                  </div>
                  <span className="status-badge shrink-0 border-active bg-active color-active">
                    {group.count} keys
                  </span>
                </header>

                <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                  <div className="min-w-0">
                    <p className="tech-label m-0">Members / {group.memberCount}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.members.map((member) => (
                        <span
                          className="status-badge border-strong bg-secondary color-secondary"
                          key={member.handle}
                          title={`/${member.handle}.keys`}
                        >
                          {member.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="tech-label m-0">Aliases</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {aliases.length ? aliases.map((alias) => (
                        <a
                          className="status-badge border-strong bg-secondary color-secondary no-underline hover:border-active hover:color-active"
                          href={`/groups/${alias}.keys`}
                          key={alias}
                          target="_blank"
                          rel="noreferrer"
                        >
                          /groups/{alias}.keys
                        </a>
                      )) : <span className="font-mono text-xs color-muted">none</span>}
                    </div>
                  </div>
                </div>

                <footer className="flex flex-wrap items-center gap-2 border-t border-base p-3 sm:px-5">
                  <a className="btn-action no-underline" href={groupPath} target="_blank" rel="noreferrer">
                    <span className="i-ph-key-duotone text-base" aria-hidden="true" />
                    Open .keys
                  </a>
                  <a
                    className="btn-action no-underline"
                    href={`/groups/${group.group.handle}.json`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="i-ph-brackets-curly-duotone text-base" aria-hidden="true" />
                    Metadata
                  </a>
                  <CopyButton value={groupCommand} label="Copy curl" />
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function EndpointsSection({
  endpointRows,
  supportedTypes,
}: {
  endpointRows: Array<[string, string]>
  supportedTypes: readonly SupportedKeyType[]
}) {
  return (
    <section className="grid gap-12 border-t border-base py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:py-18" id="endpoints">
      <div className="min-w-0">
        <p className="tech-label mb-2">HTTP interface</p>
        <h2 className="section-title m-0">Stable endpoints</h2>
        <p className="mb-6 mt-3 max-w-[58ch] text-sm leading-6 color-secondary">
          Canonical and alias routes resolve to the same key set. JSON endpoints expose ownership,
          aliases, fingerprints, and policy flags.
        </p>

        <div className="border-t border-base">
          {endpointRows.map(([path, description]) => (
            <a
              className="surface-row group grid min-h-14 grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 color-base no-underline"
              href={path}
              key={path}
              target="_blank"
              rel="noreferrer"
            >
              <span className="font-mono text-[0.625rem] font-500 color-muted">GET</span>
              <span className="min-w-0">
                <code className="block truncate font-mono text-xs" title={path}>{path}</code>
                <span className="mt-0.5 block text-xs color-muted">{description}</span>
              </span>
              <span className="i-ph-arrow-up-right text-sm color-muted transition-color duration-150 group-hover:color-active" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <p className="tech-label mb-2">Configuration abbreviations</p>
        <h2 className="section-title m-0">Supported key types</h2>
        <p className="mb-6 mt-3 max-w-[62ch] text-sm leading-6 color-secondary">
          Use a primary short name, type alias, or canonical OpenSSH algorithm in the config
          and in the type query parameter.
        </p>

        <div className="grid border-t border-base md:grid-cols-2">
          {supportedTypes.map((keyType, index) => (
            <div
              className={`surface-row grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 md:px-4 ${index % 2 === 0 ? 'md:border-r md:pl-0' : 'md:pr-0'}`}
              key={keyType.type}
            >
              <span className="min-w-0">
                <span className="block text-xs font-650 color-base">{keyType.label}</span>
                <code className="mt-0.5 block truncate font-mono text-[0.6875rem] color-muted" title={keyType.type}>
                  {keyType.type}
                </code>
                <span
                  className="mt-1 block truncate font-mono text-[0.625rem] color-muted"
                  title={keyType.aliases?.join(', ') || 'none'}
                >
                  aliases: {keyType.aliases?.join(', ') || 'none'}
                </span>
              </span>
              <span className="status-badge border-strong bg-secondary color-secondary">{keyType.shortName}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-base">
      <div className="page-shell flex min-h-20 flex-col justify-center gap-1.5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-xs color-secondary">Public credentials only. Private keys never leave their devices.</p>
        <p className="m-0 font-mono text-[0.6875rem] color-muted">Cloudflare Workers / OpenSSH</p>
      </div>
    </footer>
  )
}

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
