export function SiteFooter() {
  return (
    <footer className="border-t border-base">
      <div className="page-shell flex min-h-20 flex-col justify-center gap-1.5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-xs color-secondary">Public credentials only. Private keys never leave their devices.</p>
        <p className="m-0 font-mono text-[0.6875rem] color-muted">Cloudflare Workers / OpenSSH</p>
      </div>
    </footer>
  )
}

