# Testing

**Vitest + React Testing Library + MSW v2.** Tests live in `__tests__/` beside the component they test. Coverage threshold: 70% lines/branches/functions/statements.

## MSW setup

`server` from `msw/node`, `http` + `HttpResponse`, canonical lifecycle (`listen` / `resetHandlers` / `close`). Per-test overrides via `server.use()`. Mock Supabase and `next/navigation` are patched in `vitest.setup.ts`.

## E2E

Playwright config at `playwright.config.ts`. E2E specs live in `e2e/`. Run with `npm exec playwright test`.

Use `page.route()` network interception to mock API responses — avoid real Gemini or Supabase calls in E2E.

## Commands

```bash
npm run test           # Run Vitest (watch mode off in CI)
npm run test:coverage  # Vitest with coverage report (70% threshold)
npm exec playwright test  # Run E2E tests
```

## TDD workflow

Follow red-green-refactor:
1. Commit failing tests first (`test(scope): add failing tests for X (#N)`)
2. Implement until tests pass (`feat(scope): implement X (#N)`)
3. Refactor (`refactor(scope): clean up X (#N)`)
