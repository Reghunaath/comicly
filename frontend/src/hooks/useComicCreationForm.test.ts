import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

vi.mock('../lib/api', () => ({ default: { post: vi.fn() } }))

import api from '../lib/api'
import { useComicCreationForm } from './useComicCreationForm'

const mockApi = api as { post: ReturnType<typeof vi.fn> }

describe('useComicCreationForm', () => {
  const mockOnSuccess = vi.fn()
  const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  it('has correct default values', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    expect(result.current.values).toEqual({
      theme: '',
      style: 'manga',
      genre: 'comedy',
      panel_count: 8,
    })
  })

  it('starts with no errors', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    expect(result.current.errors).toEqual({})
  })

  it('starts not submitting', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    expect(result.current.isSubmitting).toBe(false)
  })

  it('starts with no submitError', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    expect(result.current.submitError).toBeNull()
  })

  // ── Setters ────────────────────────────────────────────────────────────────

  it('setTheme updates theme', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('rockets'))
    expect(result.current.values.theme).toBe('rockets')
  })

  it('setStyle updates style', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setStyle('pixel'))
    expect(result.current.values.style).toBe('pixel')
  })

  it('setGenre updates genre', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setGenre('horror'))
    expect(result.current.values.genre).toBe('horror')
  })

  it('setPanelCount updates panel_count', () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setPanelCount(4))
    expect(result.current.values.panel_count).toBe(4)
  })

  // ── Validation: empty theme ────────────────────────────────────────────────

  it('sets theme error on submit when theme is empty', async () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.errors.theme).toBeTruthy()
  })

  it('does not call api.post when theme is empty', async () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('does not set isSubmitting when theme is empty', async () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.isSubmitting).toBe(false)
  })

  // ── Validation: too short theme ────────────────────────────────────────────

  it('sets theme error when theme is shorter than 10 chars', async () => {
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('cats'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.errors.theme).toBeTruthy()
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  // ── Validation clears on valid submit ──────────────────────────────────────

  it('clears errors and calls api.post on valid submit after prior invalid', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'x' } })
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))

    // First: invalid submit
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.errors.theme).toBeTruthy()

    // Fix theme and resubmit
    act(() => result.current.setTheme('a valid theme here'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.errors).toEqual({})
    expect(mockApi.post).toHaveBeenCalledTimes(1)
  })

  // ── Successful submit ──────────────────────────────────────────────────────

  it('calls onSuccess with comic id on successful submit', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'comic-abc' } })
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('a valid theme here'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(mockOnSuccess).toHaveBeenCalledWith('comic-abc')
  })

  it('resets isSubmitting to false after successful submit', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'comic-abc' } })
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('a valid theme here'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.isSubmitting).toBe(false)
  })

  // ── Failed submit ──────────────────────────────────────────────────────────

  it('sets submitError from API error detail on failed submit', async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { data: { detail: 'Rate limit exceeded' } },
    })
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('a valid theme here'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.submitError).toBe('Rate limit exceeded')
  })

  it('falls back to generic error when no detail field', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('a valid theme here'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.submitError).toBeTruthy()
  })

  it('resets isSubmitting to false after failed submit', async () => {
    mockApi.post.mockRejectedValueOnce({ response: { data: { detail: 'err' } } })
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('a valid theme here'))
    await act(async () => { await result.current.handleSubmit(mockEvent) })
    expect(result.current.isSubmitting).toBe(false)
  })

  // ── In-flight state ────────────────────────────────────────────────────────

  it('sets isSubmitting to true while request is pending', async () => {
    let resolvePost!: (v: unknown) => void
    mockApi.post.mockReturnValueOnce(new Promise((res) => { resolvePost = res }))
    const { result } = renderHook(() => useComicCreationForm(mockOnSuccess))
    act(() => result.current.setTheme('a valid theme here'))

    // Start submit but don't await
    act(() => { result.current.handleSubmit(mockEvent) })
    expect(result.current.isSubmitting).toBe(true)

    // Clean up
    await act(async () => { resolvePost({ data: { id: 'x' } }) })
  })
})
