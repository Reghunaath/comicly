---
name: tdd-nextjs
description: Use this skill whenever working on a Next.js frontend project that follows Test-Driven Development. This skill enforces strict Red-Green-Refactor workflow — tests MUST be written before implementation code, no exceptions. Triggers include any request to implement a feature, component, hook, utility, page, or fix a bug in a Next.js (App Router) project. Also use when the user says "TDD", "test first", "write tests", "red-green-refactor", or references any testing task. The skill covers Vitest + React Testing Library for unit/component tests, MSW for API mocking, and Playwright guidance for E2E. Do NOT skip the test-first step for any reason.
---

# TDD for Next.js (App Router) — Strict Red-Green-Refactor

## Core Principle

**NEVER write implementation code without a failing test first.** This is non-negotiable. Every feature, component, hook, utility, and bug fix begins with a test. If you find yourself writing implementation code first, STOP — go back and write the test.

The cycle is always:

1. **RED** — Write a test that fails (because the code doesn't exist yet)
2. **GREEN** — Write the *minimum* implementation to make the test pass
3. **REFACTOR** — Clean up the code while keeping all tests green
4. **Repeat**

---

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Test runner | Vitest | Unit & component tests |
| Component testing | @testing-library/react | Render & query components |
| DOM assertions | @testing-library/jest-dom | Extended DOM matchers |
| User simulation | @testing-library/user-event | Realistic user interactions |
| API mocking | MSW (Mock Service Worker) v2 | Network-level request interception |

---

## Project Setup

### Installation

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event \
  vite-tsconfig-paths msw
```

### vitest.config.mts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/index.ts'],
    },
  },
})
```

### vitest.setup.ts

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from './src/mocks/server'

afterEach(() => {
  cleanup()
})

// MSW server lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### tsconfig.json addition

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### MSW Setup (src/mocks/)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Define default handlers here
]

// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

---

## File Conventions

### Test File Location

Colocate test files next to the source files they test:

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── page.test.tsx          # Page-level test
│   └── layout.tsx
├── components/
│   ├── comic-card/
│   │   ├── comic-card.tsx
│   │   └── comic-card.test.tsx    # Component test
├── hooks/
│   ├── use-auth.ts
│   └── use-auth.test.ts           # Hook test
├── lib/
│   ├── validators.ts
│   └── validators.test.ts         # Utility test
└── mocks/
    ├── handlers.ts
    └── server.ts
```

### Naming

- Test files: `{source-file}.test.tsx` or `{source-file}.test.ts`
- Describe blocks: match the module/component name
- Test names: describe the behavior, not the implementation — use `it('displays error when email is invalid')` not `it('calls setError with message')`

---

## The TDD Workflow — Step by Step

### For Every Task, Follow This Exact Sequence:

#### Step 1: Analyze the requirement

Before writing anything, determine:
- What is the observable behavior the user/caller will see?
- What are the inputs (props, user actions, API responses)?
- What are the outputs (rendered UI, return values, side effects)?
- What are the edge cases (empty state, error state, loading state)?

#### Step 2: Write the test file FIRST

Create the test file. Import the module that *does not exist yet*. Write one test case for the simplest behavior. The test MUST fail — typically with an import error or assertion failure.

#### Step 3: Create the minimal implementation

Create the source file. Write the absolute minimum code to make the failing test pass. Do NOT anticipate future requirements — only satisfy the current failing test.

#### Step 4: Verify GREEN

Run `vitest` (or the relevant test command). The test must pass. If it doesn't, fix the implementation — not the test (unless the test itself has a bug).

#### Step 5: Refactor

With a passing test as your safety net, improve the code:
- Extract shared logic
- Improve naming
- Remove duplication
- Optimize performance

Run tests after each refactoring step to ensure they still pass.

#### Step 6: Next test case

Add the next test for the next behavior or edge case. Return to Step 3.

---

## Test Patterns by Category

### 1. Pure Functions / Utilities

The easiest TDD target. Start here when possible.

**RED — Write the test first:**

```typescript
// src/lib/format-date.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate } from './format-date'

describe('formatDate', () => {
  it('formats ISO date string to human-readable format', () => {
    expect(formatDate('2026-03-22T00:00:00Z')).toBe('March 22, 2026')
  })

  it('returns "Invalid date" for malformed input', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date')
  })

  it('handles null/undefined gracefully', () => {
    expect(formatDate(null)).toBe('Invalid date')
    expect(formatDate(undefined)).toBe('Invalid date')
  })
})
```

**GREEN — Minimal implementation:**

```typescript
// src/lib/format-date.ts
export function formatDate(input: string | null | undefined): string {
  if (!input) return 'Invalid date'
  const date = new Date(input)
  if (isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
```

---

### 2. React Components (Client Components)

Test behavior as the user sees it: rendered output, interactions, state changes.

**RED:**

```tsx
// src/components/status-badge/status-badge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('applies success styling for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('completed')).toHaveClass('bg-green-100')
  })

  it('applies warning styling for generating status', () => {
    render(<StatusBadge status="generating" />)
    expect(screen.getByText('generating')).toHaveClass('bg-yellow-100')
  })

  it('applies error styling for failed status', () => {
    render(<StatusBadge status="failed" />)
    expect(screen.getByText('failed')).toHaveClass('bg-red-100')
  })
})
```

**GREEN:**

```tsx
// src/components/status-badge/status-badge.tsx
'use client'

const styleMap: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  generating: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800',
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styleMap[status] ?? 'bg-gray-100 text-gray-800'
  return <span className={`px-2 py-1 rounded text-sm ${style}`}>{status}</span>
}
```

---

### 3. Components with User Interaction

Use `@testing-library/user-event` for realistic interaction simulation.

**RED:**

```tsx
// src/components/search-box/search-box.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBox } from './search-box'

describe('SearchBox', () => {
  it('calls onSearch with the input value when user submits', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBox onSearch={onSearch} />)

    await user.type(screen.getByRole('searchbox'), 'space cats')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).toHaveBeenCalledWith('space cats')
  })

  it('does not call onSearch when input is empty', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBox onSearch={onSearch} />)

    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('clears input after successful search', async () => {
    const user = userEvent.setup()
    render(<SearchBox onSearch={vi.fn()} />)

    await user.type(screen.getByRole('searchbox'), 'test')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(screen.getByRole('searchbox')).toHaveValue('')
  })
})
```

---

### 4. Custom Hooks

Use `renderHook` from `@testing-library/react`.

**RED:**

```typescript
// src/hooks/use-debounce.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './use-debounce'

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update the value before the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    )

    rerender({ value: 'world', delay: 300 })
    vi.advanceTimersByTime(100)

    expect(result.current).toBe('hello')
    vi.useRealTimers()
  })

  it('updates the value after the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    )

    rerender({ value: 'world', delay: 300 })
    vi.advanceTimersByTime(300)

    expect(result.current).toBe('world')
    vi.useRealTimers()
  })
})
```

---

### 5. Components That Fetch Data (with MSW)

Mock API calls at the network level using MSW. Never mock `fetch` directly.

**RED:**

```tsx
// src/components/user-profile/user-profile.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { UserProfile } from './user-profile'

describe('UserProfile', () => {
  it('displays user name after loading', async () => {
    server.use(
      http.get('/api/user/me', () => {
        return HttpResponse.json({ name: 'Alice', email: 'alice@example.com' })
      })
    )

    render(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    server.use(
      http.get('/api/user/me', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ name: 'Alice' })
      })
    )

    render(<UserProfile />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error message when API fails', async () => {
    server.use(
      http.get('/api/user/me', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    render(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---

### 6. Next.js Navigation Mocking

Mock `next/navigation` hooks for components that use routing.

```typescript
// At the top of the test file
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams('tab=settings'),
  useParams: () => ({ id: '123' }),
}))
```

For tests that need to assert on `router.push()` calls:

```typescript
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

describe('NavigationComponent', () => {
  it('navigates to /login on logout', async () => {
    const push = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    })

    const user = userEvent.setup()
    render(<LogoutButton />)
    await user.click(screen.getByRole('button', { name: /logout/i }))

    expect(push).toHaveBeenCalledWith('/login')
  })
})
```

---

### 7. Next.js Server Components

Vitest **cannot** test async Server Components. For these:
- Extract logic into testable pure functions or hooks
- Test the extracted logic with Vitest
- Test the assembled Server Component with Playwright (E2E)

```
// BAD — cannot unit test this directly
async function DashboardPage() {
  const data = await fetchDashboardData()  // server-side fetch
  return <Dashboard data={data} />
}

// GOOD — extract and test separately
// src/lib/dashboard.ts — testable with Vitest
export function transformDashboardData(raw: RawData): DashboardViewModel { ... }

// src/components/dashboard.tsx — testable with Vitest (client component)
'use client'
export function Dashboard({ data }: { data: DashboardViewModel }) { ... }

// src/app/dashboard/page.tsx — test with Playwright E2E
export default async function DashboardPage() {
  const raw = await fetchDashboardData()
  const data = transformDashboardData(raw)
  return <Dashboard data={data} />
}
```

---

### 8. Form Validation

Forms are a high-value TDD target. Test validation logic separately from the form component.

**RED — Validation logic first:**

```typescript
// src/lib/validators.test.ts
import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword } from './validators'

describe('validateEmail', () => {
  it('returns null for valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validateEmail('')).toBe('Email is required')
  })

  it('returns error for invalid format', () => {
    expect(validateEmail('not-an-email')).toBe('Invalid email format')
  })
})

describe('validatePassword', () => {
  it('returns null for password with 8+ characters', () => {
    expect(validatePassword('abcd1234')).toBeNull()
  })

  it('returns error for password shorter than 8 characters', () => {
    expect(validatePassword('abc')).toBe('Password must be at least 8 characters')
  })
})
```

**RED — Then the form component:**

```tsx
// src/components/login-form/login-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('shows validation error when submitting empty email', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('calls onSubmit with email and password when form is valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securePass1')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'securePass1',
    })
  })
})
```

---

## Anti-Patterns — Things to NEVER Do

### 1. Writing implementation before tests

This is the cardinal sin. If you catch yourself doing this, delete the implementation and start over with a test.

### 2. Testing implementation details

```typescript
// BAD — tests internal state
expect(component.state.isOpen).toBe(true)

// BAD — tests that a specific function was called internally
expect(internalHelper).toHaveBeenCalled()

// GOOD — tests observable behavior
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

### 3. Writing tests that always pass

If a test passes the moment you write it, one of these is true:
- The behavior was already implemented (then you're not doing TDD)
- The test is not actually asserting anything meaningful
- The test is asserting a tautology

### 4. Over-mocking

```typescript
// BAD — mocks away everything; tests nothing real
vi.mock('./utils')
vi.mock('./api')
vi.mock('./store')
// What is even being tested here?

// GOOD — mock only external boundaries (network, timers, navigation)
server.use(http.get('/api/data', () => HttpResponse.json({ items: [] })))
```

### 5. Giant test files with no structure

```typescript
// BAD
it('does everything', async () => {
  // 80 lines of setup, actions, and assertions
})

// GOOD — one behavior per test, grouped by feature
describe('ComicCard', () => {
  describe('rendering', () => {
    it('displays the comic title', () => { ... })
    it('shows the cover image', () => { ... })
  })

  describe('actions', () => {
    it('calls onDelete when delete button is clicked', () => { ... })
    it('navigates to comic detail on card click', () => { ... })
  })
})
```

### 6. Using snapshot tests as a substitute for behavioral tests

Snapshots are fragile and give false confidence. Use them sparingly (e.g., for ensuring a serialized data structure doesn't change). Never use them as the *only* test for a component.

---

## Query Priority (React Testing Library)

When querying elements, prefer queries that reflect how users interact with the page:

1. **`getByRole`** — always the first choice (buttons, headings, links, textboxes)
2. **`getByLabelText`** — for form fields
3. **`getByPlaceholderText`** — when there's no label
4. **`getByText`** — for static text content
5. **`getByDisplayValue`** — for filled form fields
6. **`getByAltText`** — for images
7. **`getByTestId`** — LAST RESORT only. If you need this, consider improving your component's accessibility first.

---

## Async Patterns

### Waiting for elements to appear

```typescript
// For elements that appear after an async operation
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// Or use findBy* (combines getBy + waitFor)
const heading = await screen.findByRole('heading', { name: /dashboard/i })
expect(heading).toBeInTheDocument()
```

### Waiting for elements to disappear

```typescript
await waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})

// Or use waitForElementToBeRemoved
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i))
```

### Testing loading → success transitions

```typescript
it('transitions from loading to content', async () => {
  server.use(
    http.get('/api/items', async () => {
      await new Promise((r) => setTimeout(r, 50))
      return HttpResponse.json({ items: [{ id: '1', name: 'Item 1' }] })
    })
  )

  render(<ItemList />)

  // Initially shows loading
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Eventually shows content
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  // Loading is gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})
```

---

## Checklist Before Marking a Feature Complete

- [ ] All tests written BEFORE implementation (Red-Green-Refactor for each)
- [ ] Happy path tested
- [ ] Error states tested
- [ ] Loading states tested
- [ ] Empty states tested
- [ ] Edge cases tested (null, undefined, empty string, boundary values)
- [ ] No implementation-detail tests (all tests target observable behavior)
- [ ] All tests pass: `vitest run`
- [ ] No skipped tests (`it.skip`, `describe.skip`) left behind
- [ ] Refactoring pass completed with tests green throughout

---



## Quick Reference: Common Vitest APIs

| API | Purpose |
|-----|---------|
| `describe(name, fn)` | Group related tests |
| `it(name, fn)` / `test(name, fn)` | Define a single test case |
| `expect(value)` | Create an assertion |
| `vi.fn()` | Create a mock function |
| `vi.mock(module)` | Mock an entire module |
| `vi.mocked(fn)` | Type-safe access to a mocked function |
| `vi.useFakeTimers()` | Control `setTimeout`, `setInterval`, `Date.now()` |
| `vi.advanceTimersByTime(ms)` | Fast-forward fake timers |
| `vi.useRealTimers()` | Restore real timers |
| `beforeEach(fn)` | Run before each test in the current describe |
| `afterEach(fn)` | Run after each test (cleanup is automatic via setup file) |
| `server.use(handler)` | Override MSW handler for a single test |