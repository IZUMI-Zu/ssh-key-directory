import type { DirectoryResponse } from '../directory.ts'
import { CopyButton } from './CopyButton.tsx'

export function HeroSection({
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

