import type { DirectoryIndexResponse } from '../directory.ts'

export function SummarySection({
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

