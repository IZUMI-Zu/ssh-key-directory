import type { DirectoryIndexResponse, GroupResponse } from '../directory.ts'
import { CopyButton } from './CopyButton.tsx'

export function GroupsSection({
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

