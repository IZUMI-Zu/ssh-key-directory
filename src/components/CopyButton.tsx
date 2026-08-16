import { useState } from 'react'

export function CopyButton({
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
