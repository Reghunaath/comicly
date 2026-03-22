type PanelCount = 4 | 8 | 12

const LENGTH_OPTIONS: { value: PanelCount; label: string }[] = [
  { value: 4, label: 'Short' },
  { value: 8, label: 'Standard' },
  { value: 12, label: 'Long' },
]

interface LengthSelectorProps {
  value: PanelCount
  onChange: (v: PanelCount) => void
}

export function LengthSelector({ value, onChange }: LengthSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend
        className="text-[11px] font-medium uppercase tracking-widest"
        style={{ color: 'var(--text)' }}
      >
        Length
      </legend>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {LENGTH_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className="flex flex-col items-start rounded-lg border px-3.5 py-3 transition-colors hover:[border-color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                background: selected ? 'var(--accent-bg)' : 'var(--bg)',
              }}
            >
              <span
                className="text-2xl font-medium leading-none"
                style={{ color: selected ? 'var(--accent)' : 'var(--text-h)' }}
              >
                {opt.value}
              </span>
              <span
                className="mt-1 text-xs"
                style={{ color: selected ? 'var(--accent)' : 'var(--text)' }}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
