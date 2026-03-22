import { useNavigate } from 'react-router-dom'
import { useComicCreationForm } from '../hooks/useComicCreationForm'
import { ThemeInput } from '../components/comic/ThemeInput'
import { StyleSelector } from '../components/comic/StyleSelector'
import { GenreSelector } from '../components/comic/GenreSelector'
import { LengthSelector } from '../components/comic/LengthSelector'

export function CreatePage() {
  const navigate = useNavigate()

  const {
    values,
    errors,
    isSubmitting,
    submitError,
    setTheme,
    setStyle,
    setGenre,
    setPanelCount,
    handleSubmit,
  } = useComicCreationForm((id) => navigate(`/comic/${id}`))

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-left">
      <header className="mb-8">
        <h1
          className="text-xl font-medium"
          style={{ color: 'var(--text-h)', margin: 0 }}
        >
          Create a comic
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
          Describe your idea — AI handles the rest.
        </p>
      </header>

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)', boxShadow: 'var(--shadow)' }}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <ThemeInput value={values.theme} error={errors.theme} onChange={setTheme} />

          <StyleSelector value={values.style} onChange={setStyle} />

          <GenreSelector value={values.genre} onChange={setGenre} />

          <LengthSelector value={values.panel_count as 4 | 8 | 12} onChange={setPanelCount} />

          {submitError && (
            <p
              className="rounded-lg border px-3.5 py-2.5 text-sm"
              role="alert"
              style={{
                borderColor: 'var(--error-border)',
                background: 'var(--error-bg)',
                color: 'var(--error)',
              }}
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            style={{
              background: isSubmitting ? 'var(--accent-border)' : 'var(--accent)',
              color: '#fff',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Generating…' : 'Generate comic →'}
          </button>
        </form>
      </div>
    </div>
  )
}
