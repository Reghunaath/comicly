interface ThemeInputProps {
  value: string
  error?: string
  onChange: (v: string) => void
}

export function ThemeInput({ value, error, onChange }: ThemeInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="theme"
        className="text-[11px] font-medium uppercase tracking-widest"
        style={{ color: 'var(--text)' }}
      >
        Your idea
      </label>
      <textarea
        id="theme"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. A cat accidentally becomes the captain of a spaceship…"
        rows={4}
        aria-describedby={error ? 'theme-error' : undefined}
        aria-invalid={!!error}
        className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        style={{
          background: 'var(--bg)',
          color: 'var(--text-h)',
          borderColor: error ? 'var(--error-border)' : 'var(--border)',
        }}
      />
      {error && (
        <p id="theme-error" className="text-xs" role="alert" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
