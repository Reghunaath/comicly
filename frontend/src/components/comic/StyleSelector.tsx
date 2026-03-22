import type { ComicStyle } from '../../types'

const STYLE_OPTIONS: { value: ComicStyle; label: string; icon: string }[] = [
  { value: 'manga', label: 'Manga', icon: '🎌' },
  { value: 'american', label: 'American', icon: '💥' },
  { value: 'watercolor', label: 'Watercolor', icon: '🎨' },
  { value: 'pixel', label: 'Pixel', icon: '🕹' },
  { value: 'minimalist', label: 'Minimal', icon: '✏️' },
]

interface StyleSelectorProps {
  value: ComicStyle
  onChange: (v: ComicStyle) => void
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend
        className="text-[11px] font-medium uppercase tracking-widest"
        style={{ color: 'var(--text)' }}
      >
        Art style
      </legend>
      <div className="grid grid-cols-5 gap-2 mt-1">
        {STYLE_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className="flex flex-col items-center gap-1 rounded-lg border py-2.5 px-1 text-center transition-colors hover:[border-color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                background: selected ? 'var(--accent-bg)' : 'var(--bg)',
                color: selected ? 'var(--accent)' : 'var(--text)',
              }}
            >
              <span className="text-xl leading-none" aria-hidden="true">{opt.icon}</span>
              <span className="text-[11px] font-medium">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
