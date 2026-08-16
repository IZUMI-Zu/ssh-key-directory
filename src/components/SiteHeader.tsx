export function SiteHeader({
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
          <img className="size-10 shrink-0" src="/favicon.svg?v=2026081602" alt="" aria-hidden="true" />
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
