# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint

# Testing (after Vitest setup — see tdd skill)
npm run test         # Vitest watch mode
npm run test:run     # Run all tests once
npm run test:coverage
```

## Architecture

**Next.js 16.2.2 + React 19** using the **App Router** (not Pages Router). All routes live under `app/`.

**Styling:** Tailwind CSS v4 via `@tailwindcss/postcss` — no `tailwind.config.js` needed.

**Path alias:** `@/*` maps to the project root (e.g., `@/components`, `@/lib`).

**Fonts:** Geist Sans and Geist Mono loaded in `app/layout.tsx`.

### Planned structure (from project skills)

```
app/
├── (marketing)/     # Public pages — no URL segment
├── (dashboard)/     # Authenticated pages — no URL segment
├── (auth)/          # Login/signup flows
└── api/             # API routes (route.ts only, no page.tsx)

src/
├── components/      # Colocate component + test: component.tsx + component.test.tsx
├── hooks/
├── lib/             # Pure utilities
└── mocks/           # MSW handlers and server setup
```


## Key conventions from skills

- `route.ts` and `page.tsx` **cannot coexist** in the same folder.
- `error.tsx` **must** be `"use client"`.
- In Next.js 15+, `params` is a Promise — always `await params` before accessing properties.
- Parallel route slots (`@name/`) require a `default.tsx` fallback.
- Route group names like `(marketing)` never appear in URLs.
- Mock API calls with MSW at the network level — never mock `fetch` directly.
- Server Components cannot be unit tested with Vitest; extract logic into pure functions and test those, then use Playwright for E2E.