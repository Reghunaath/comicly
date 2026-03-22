import type { ComicGenre } from '../../types'

const GENRE_OPTIONS: { value: ComicGenre; label: string }[] = [
  { value: 'comedy', label: 'Comedy' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'horror', label: 'Horror' },
  { value: 'sci-fi', label: 'Sci-fi' },
  { value: 'slice-of-life', label: 'Slice of life' },
  { value: 'romance', label: 'Romance' },
]

interface GenreSelectorProps {
  value: ComicGenre
  onChange: (v: ComicGenre) => void
}

export function GenreSelector({ value, onChange }: GenreSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend
        className="text-[11px] font-medium uppercase tracking-widest"
        style={{ color: 'var(--text)' }}
      >
        Genre
      </legend>
      <div className="flex flex-wrap gap-2 mt-1">
        {GENRE_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors hover:[border-color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                background: selected ? 'var(--accent-bg)' : 'var(--bg)',
                color: selected ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
