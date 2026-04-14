# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

No test runner is configured.

## Architecture

**Next.js 16 App Router** project. All pages and layouts live under `app/`. The entry points are:

- `app/layout.tsx` — root layout, sets up Geist fonts via `next/font/google`, applies font CSS variables globally
- `app/page.tsx` — home page (`/`)

**Styling** uses Tailwind CSS v4 (imported via `@import "tailwindcss"` in `globals.css`, not the v3 plugin syntax). Theme tokens are declared as CSS variables in `globals.css`:
- `--background` / `--foreground` for light/dark mode (toggled via `prefers-color-scheme`)
- `--font-sans` / `--font-mono` wired to Geist font variables

**TypeScript** is in strict mode. Path alias `@/*` resolves to the repo root (e.g. `@/app/...`, `@/components/...`).

**ESLint** uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` via the flat config format (`eslint.config.mjs`).

## Note

- DO NOT visit @docs/comicly-technical-prd.md unless needed. Visit separate files in @docs/separate-docs instead.
