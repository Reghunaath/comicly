import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import api from '../lib/api'
import { CreatePage } from './CreatePage'

const mockApi = api as { post: ReturnType<typeof vi.fn> }

function renderPage() {
  return render(
    <MemoryRouter>
      <CreatePage />
    </MemoryRouter>
  )
}

const VALID_THEME = 'A cat accidentally becomes a spaceship captain'

describe('CreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders a page heading', () => {
    renderPage()
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('renders a theme input labeled "Your idea"', () => {
    renderPage()
    expect(screen.getByLabelText(/your idea/i)).toBeInTheDocument()
  })

  it('renders a style selector section', () => {
    renderPage()
    expect(screen.getByText(/art style/i)).toBeInTheDocument()
  })

  it('renders a genre selector section', () => {
    renderPage()
    expect(screen.getByText(/genre/i)).toBeInTheDocument()
  })

  it('renders a length selector section', () => {
    renderPage()
    expect(screen.getByText(/length/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /generate comic/i })).toBeInTheDocument()
  })

  // ── Default payload ────────────────────────────────────────────────────────

  it('submits default values (manga, comedy, 8) when selectors are unchanged', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'comic-xyz' } })
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/comics/generate',
        expect.objectContaining({ style: 'manga', genre: 'comedy', panel_count: 8 })
      )
    })
  })

  // ── Selector interactions ──────────────────────────────────────────────────

  it('submits updated style when style is changed to pixel', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'x' } })
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    await userEvent.click(screen.getByRole('button', { name: /pixel/i }))
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/comics/generate',
        expect.objectContaining({ style: 'pixel' })
      )
    })
  })

  it('submits updated genre when genre is changed to horror', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'x' } })
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    await userEvent.click(screen.getByRole('button', { name: /horror/i }))
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/comics/generate',
        expect.objectContaining({ genre: 'horror' })
      )
    })
  })

  it('submits panel_count as number 4 when length is changed', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'x' } })
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    // Click the length option that represents 4 panels
    const fourButton = screen.getAllByRole('button').find(
      (btn) => btn.textContent?.includes('4') && !btn.textContent?.includes('generate')
    )
    await userEvent.click(fourButton!)
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/comics/generate',
        expect.objectContaining({ panel_count: 4 })
      )
    })
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('shows error alert when theme is empty on submit', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('shows error alert when theme is shorter than 10 chars', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/your idea/i), 'cats')
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('hides theme error after correcting theme to 10+ chars', async () => {
    renderPage()
    // Trigger error
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Fix theme
    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // ── Successful submit ──────────────────────────────────────────────────────

  it('navigates to /comic/:id after successful submit', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 'comic-xyz' } })
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/comic/comic-xyz')
    })
  })

  // ── Error display ──────────────────────────────────────────────────────────

  it('shows submit error alert when API call fails', async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { data: { detail: 'Rate limit exceeded' } },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Rate limit exceeded')
    })
  })

  // ── In-flight disabled state ───────────────────────────────────────────────

  it('disables submit button while request is in flight', async () => {
    let resolvePost!: (v: unknown) => void
    mockApi.post.mockReturnValueOnce(new Promise((res) => { resolvePost = res }))
    renderPage()

    await userEvent.type(screen.getByLabelText(/your idea/i), VALID_THEME)
    await userEvent.click(screen.getByRole('button', { name: /generate comic/i }))

    expect(screen.getByRole('button', { name: /generat/i })).toBeDisabled()

    // Clean up
    await waitFor(() => { resolvePost({ data: { id: 'x' } }) })
  })
})
