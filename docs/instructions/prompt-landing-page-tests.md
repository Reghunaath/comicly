# Task: Write and Run Component Tests for Landing Page (#8)

## Objective

Write component tests for the Landing Page (`src/frontend/landing/`) and verify they pass. This is part of Sprint 1 issue #8.

## Constraints

- **Test framework:** Vitest + React Testing Library
- **API mocking:** msw (Mock Service Worker) — do NOT use `vi.fn()` to mock `fetch` directly
- **Test location:** `src/frontend/landing/__tests__/LandingPage.test.tsx` (co-located)
- **Router mocking:** Mock `next/navigation` `useRouter` — this is an App Router project, NOT Pages Router
- **Types:** Import all types from `src/backend/lib/types.ts` (shared contract, do not duplicate)
- **Environment:** Vitest with `jsdom` environment

## What to Test

Write tests covering these categories. Each test should be independent and self-contained.

### 1. Rendering
- All core elements render on mount: prompt textarea, 6 art style cards (manga, western_comic, watercolor_storybook, minimalist_flat, vintage_newspaper, custom), page count input, "Surprise Me" button, "Create Comic" button

### 2. Art Style Selection
- Clicking a style card marks it as selected (visual or aria state change)
- Clicking "Custom" reveals an additional text input for custom style prompt
- Selecting a non-custom style after custom hides the custom input

### 3. Surprise Me
- Clicking "Surprise Me" calls `GET /api/comic/random-idea`
- On success, the textarea is populated with the returned idea
- On API error, an error message is shown (does not crash)

### 4. Form Validation
- Submitting with an empty prompt shows a validation error and does NOT call `POST /api/comic`
- Page count is clamped or validated to the range 1–15 (constants: `MIN_PAGES = 1`, `MAX_PAGES = 15`)

### 5. Successful Submission
- With valid input (prompt filled, style selected, page count in range), clicking "Create Comic" sends `POST /api/comic` with correct payload shape: `{ prompt, artStyle, customStylePrompt, pageCount }`
- On 201 response, calls `router.push("/create?id=<comicId>")`

### 6. Loading State
- While `POST /api/comic` is in-flight, the "Create Comic" button is disabled or shows a loading indicator
- While `GET /api/comic/random-idea` is in-flight, the "Surprise Me" button is disabled or shows loading

### 7. Error Handling
- If `POST /api/comic` returns 500, an error message is displayed to the user
- The form remains interactive after an error (user can retry)

## msw Setup Pattern

Use `setupServer` from `msw/node`. Define default handlers, then override per-test with `server.use()` when needed.

```typescript
// Default happy-path handlers
const server = setupServer(
  http.get("/api/comic/random-idea", () =>
    HttpResponse.json({ idea: "A robot learns to paint" })
  ),
  http.post("/api/comic", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { comicId: "test-comic-id", followUpQuestions: [] },
      { status: 201 }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Router Mock Pattern

```typescript
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
```

Reset `mockPush` in `beforeEach`.

## Execution Steps

1. **Read first.** Before writing any test code, read the actual Landing Page component source to understand its real element structure, props, event handlers, and internal state. Adapt selectors (placeholder text, button labels, roles, test-ids) to match the actual implementation — do NOT assume element names from this prompt alone.
2. **Check dependencies.** Verify that `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `msw` are installed. If any are missing, install them with `pnpm add -D`.
3. **Check vitest config.** Ensure `vitest.config.ts` has `environment: "jsdom"` and the coverage thresholds set to 70%.
4. **Write the test file.** Create `src/frontend/landing/__tests__/LandingPage.test.tsx` with all test cases above.
5. **Run tests.** Execute `pnpm test src/frontend/landing/__tests__/LandingPage.test.tsx` and verify all tests pass. If any test fails due to a mismatch between the test and the component implementation, fix the TEST to align with the component (unless the component has a clear bug — in that case, note it).
6. **Run coverage.** Execute `pnpm test:coverage` and report the landing page component's line/branch/statement/function coverage.
7. **Summary.** After all tests pass, provide a brief summary: number of tests, categories covered, any component bugs discovered, and current coverage numbers.

## Important

- Use `userEvent` (from `@testing-library/user-event`) for interactions, NOT `fireEvent` — `userEvent` simulates real browser behavior more accurately.
- Use `screen.findBy*` (async) for elements that appear after state changes or API calls.
- Use `screen.queryBy*` for asserting that elements do NOT exist.
- Do NOT test implementation details (internal state, hook internals). Test what the user sees and does.
- Keep each test focused on one behavior. Prefer multiple small tests over fewer large ones.
