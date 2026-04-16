---
name: Comicly Testing Infrastructure
description: Vitest + RTL + MSW setup decisions, config quirks, and path alias behavior
type: project
---

Vitest is configured with jsdom environment and MSW for HTTP-level mocking. All frontend tests live co-located under `src/frontend/<feature>/__tests__/`.

**Why:** No test runner existed at project start; Vitest was chosen to align with the Vite-based build toolchain used for frontend code.

**How to apply:** All new test files go under `src/frontend/<feature>/__tests__/`. Use MSW `setupServer` with `http.get/post/put` to mock API calls. Do not mock `fetch` directly.

Key config facts:
- `vitest.config.ts` maps `@` alias to `./src` (NOT repo root) — so `@/frontend/lib/api` resolves to `src/frontend/lib/api`
- `vitest.setup.ts` is the global setup file (imports `@testing-library/jest-dom`)
- `vi.useRealTimers()` is called in the shared `afterEach` — fake timer tests are safe to use `vi.useFakeTimers()` without manual cleanup
- `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` is the standard setup() pattern across all test files
- Polling tests: use `act(async () => { vi.advanceTimersByTime(6000); })` then `waitFor` to assert state after interval fires
- Toast disappearance tests: advance timers by 3100ms (toast timeout is 3000ms)

Tested components so far:
- `src/frontend/script-review/ScriptReviewPage.tsx` — full suite in `__tests__/ScriptReviewPage.test.tsx`
- `src/frontend/comic-viewer/ComicViewerPage.tsx` — full suite in `__tests__/ComicViewerPage.test.tsx`
