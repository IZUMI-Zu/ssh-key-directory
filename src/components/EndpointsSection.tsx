import type { SupportedKeyType } from '../key-types.ts'

export function EndpointsSection({
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

