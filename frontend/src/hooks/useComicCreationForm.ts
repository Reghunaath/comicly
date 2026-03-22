import { useState, useCallback } from 'react'
import type { ComicStyle, ComicGenre, GenerateComicRequest } from '../types'
import api from '../lib/api'

type PanelCount = 4 | 8 | 12
type FormErrors = Partial<Record<keyof GenerateComicRequest, string>>

const FORM_DEFAULTS: GenerateComicRequest = {
  theme: '',
  style: 'manga',
  genre: 'comedy',
  panel_count: 8,
}

interface UseComicCreationFormReturn {
  values: GenerateComicRequest
  errors: FormErrors
  isSubmitting: boolean
  submitError: string | null
  setTheme: (v: string) => void
  setStyle: (v: ComicStyle) => void
  setGenre: (v: ComicGenre) => void
  setPanelCount: (v: PanelCount) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
}

function validate(values: GenerateComicRequest): FormErrors {
  const errors: FormErrors = {}
  if (!values.theme.trim()) {
    errors.theme = 'Please describe your story idea.'
  } else if (values.theme.trim().length < 10) {
    errors.theme = 'Give us a bit more to work with — at least 10 characters.'
  }
  return errors
}

export function useComicCreationForm(
  onSuccess: (id: string) => void
): UseComicCreationFormReturn {
  const [values, setValues] = useState<GenerateComicRequest>(FORM_DEFAULTS)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setTheme = useCallback((v: string) => {
    setValues((prev) => ({ ...prev, theme: v }))
    setErrors((prev) => ({ ...prev, theme: undefined }))
  }, [])

  const setStyle = useCallback(
    (v: ComicStyle) => setValues((prev) => ({ ...prev, style: v })),
    []
  )

  const setGenre = useCallback(
    (v: ComicGenre) => setValues((prev) => ({ ...prev, genre: v })),
    []
  )

  const setPanelCount = useCallback(
    (v: PanelCount) => setValues((prev) => ({ ...prev, panel_count: v })),
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitError(null)

      const validationErrors = validate(values)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }

      setErrors({})
      setIsSubmitting(true)

      try {
        const res = await api.post<{ id: string }>('/api/comics/generate', values)
        onSuccess(res.data.id)
      } catch (err) {
        const detail = (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail
        setSubmitError(detail ?? 'Something went wrong. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, onSuccess]
  )

  return { values, errors, isSubmitting, submitError, setTheme, setStyle, setGenre, setPanelCount, handleSubmit }
}
