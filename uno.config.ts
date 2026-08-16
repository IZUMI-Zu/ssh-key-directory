import {
  defineConfig,
  presetIcons,
  presetWind4,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  theme: {
    font: {
      sans: '"DM Sans Variable", "Segoe UI", sans-serif',
      mono: '"DM Mono", Consolas, monospace',
    },
  },
  presets: [
    presetWind4({
      preflights: {
        reset: true,
      },
    }),
    presetIcons({
      scale: 1.05,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [transformerVariantGroup()],
  shortcuts: [
    {
      'bg-base': 'bg-[#f6f7f4] dark:bg-[#111310]',
      'bg-nav': 'bg-[#f6f7f4]/88 dark:bg-[#111310]/88',
      'bg-secondary': 'bg-[#eceee9] dark:bg-[#191c18]',
      'bg-elevated': 'bg-[#fbfcf9] dark:bg-[#161815]',
      'bg-active': 'bg-[#e2ece1] dark:bg-[#1e2b1f]',
      'color-base': 'text-[#252923] dark:text-[#e7eae4]',
      'color-secondary': 'text-[#5f665d] dark:text-[#aeb5aa]',
      'color-muted': 'text-[#8c9289] dark:text-[#737b70]',
      'color-active': 'text-[#3f7446] dark:text-[#86b98a]',
      'border-base': 'border-[#dce0d9] dark:border-[#2b3029]',
      'border-strong': 'border-[#c4cac1] dark:border-[#3c4339]',
      'border-active': 'border-[#80a886]/55 dark:border-[#65836a]/65',
      'surface-panel': 'border border-base rounded-xl bg-elevated',
      'surface-row': 'border-b border-base last:border-b-0',
      'tech-label': 'font-mono text-[0.6875rem] leading-4 tracking-[0.08em] uppercase color-muted',
      'tech-value': 'font-mono text-xs tabular-nums color-secondary',
      'status-badge': 'inline-flex h-6 items-center justify-center gap-1.5 rounded-md border px-2 pt-px font-mono text-[0.625rem] leading-none tracking-[0.06em] uppercase',
      'btn-action': 'tap-scale inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-strong bg-elevated px-3 color-secondary font-medium text-sm transition-[color,background-color,border-color,opacity] duration-150 hover:bg-active hover:color-active hover:border-active disabled:pointer-events-none disabled:opacity-35',
      'btn-icon': 'tap-scale inline-flex size-10 items-center justify-center rounded-lg border border-transparent color-secondary transition-[color,background-color,border-color,opacity] duration-150 hover:bg-active hover:color-active hover:border-active',
      'code-block': 'min-w-0 rounded-lg bg-[#e9ece6] dark:bg-[#0d0f0c] px-3 py-2.5 font-mono text-xs leading-5 color-base',
      'page-shell': 'mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8',
      'section-title': 'text-balance text-2xl font-650 tracking-[-0.025em] color-base sm:text-3xl',
      'tap-scale': 'transition-transform active:scale-[0.97]',
      'z-top-nav': 'z-60',
    },
  ],
})
