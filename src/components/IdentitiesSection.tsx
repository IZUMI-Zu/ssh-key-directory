import type { DirectoryIndexResponse, DirectoryResponse } from '../directory.ts'
import { CopyButton } from './CopyButton.tsx'
import { KeyIcon } from './KeyIcon.tsx'

export function IdentitiesSection({
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

