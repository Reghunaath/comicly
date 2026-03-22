# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This repo covers the **frontend only**. Backend (FastAPI) is handled by a separate team member. Do not scaffold, modify, or make assumptions about backend code.

**Sprint plan & issue tracking:** `docs/prd_frontend_specific.md`

When required to refer a file in `docs/samples`, note that those files are FOR LAYOUT REFERENCE ONLY. You don't have to use the same elements in the sample code.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check (tsc -b) + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test runner is configured yet — it needs to be added (Vitest is the natural choice with Vite).

## Architecture

**Stack:** React 19 + TypeScript (strict) + Vite. No routing, state management, or UI library installed yet — these are Sprint 1 tasks.

**Planned additions (per PRD in `docs/prd_frontend_specific.md`):**

- React Router for client-side routing
- `@supabase/supabase-js` for auth (frontend calls Supabase directly — the FastAPI backend has NO auth endpoints)
- axios or fetch wrapper that auto-injects JWT from Supabase session via `Authorization: Bearer <token>`
- UI library (Tailwind CSS or Ant Design)

**Auth pattern:** Supabase Auth SDK handles register/login/logout entirely on the frontend. The resulting JWT is attached to all backend API requests. An `AuthContext` (React Context) centralizes session state using `supabase.auth.onAuthStateChange()`.

**Backend API:** FastAPI, all routes prefixed `/api/`. Panel images are served as static files at `/uploads/comics/{comic_id}/panel-N.png`.

**Comic generation is async:** POST to generate returns immediately with a comic ID; the frontend must poll `/api/comics/{id}/status` until complete.

**Route table (Sprint 1):**

```
/login        — Login page
/register     — Register page
/create       — Comic creation form
/comic/:id    — Comic reading/detail page
```

**Sprint 2 additions:**

```
/library      — User's comic library with search
/share/:token — Guest-accessible shared comic view
```

**Sprint 3 additions:**

```
/admin        — Admin dashboard (stats + reports)
```

**Directory layout intent:**

```
src/
  components/
    comic/    — Comic reader, panel display
    layout/   — Top navbar, page shell
    ui/       — Shared primitives (buttons, inputs, etc.)
  hooks/      — Custom hooks (e.g., useAuth, useComicStatus)
  lib/        — Supabase client singleton, axios wrapper
  pages/      — One file per route
  store/      — Global state (AuthContext, etc.)
  types/      — Shared TypeScript interfaces
```

## Design Tokens

`src/index.css` defines CSS variables for theming (light/dark auto via `prefers-color-scheme`):

- `--accent: #aa3bff` (light) / `#c084fc` (dark)
- `--bg`, `--text`, `--text-h`, `--border`, `--code-bg`, `--shadow`
- Font stacks: `--sans`, `--heading`, `--mono`

Use these variables rather than hard-coded colors.

## Environment Variables

`.env` is present but empty. It will need (at minimum):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`



## Do s

- When finish implementation, fix all linting errors and warnings. When reporting a finished implementation, add "[imp]" at the beginning of the first sentence.
- When additional dependencies are needed, add "[dep]" at the beginning of the first sentence or request.(for example, [dep]The xxxx part needs tailwind CSS). Always ask for permission before install dependencies
- For sensitive files(`.env` for example), you should create a new file(or refer to existing related not-sensitive file) for further coding.
- Based on Claude Code's mechanism, you must first read a file before you can modify it; ensure this action is performed before execution.

## Don't s

- Do NOT implement features beyond the scope described. The plan is ALWAYS included in the scope.
- At this stage, please refrain from performing any operations on GitHub repositories.

## AI Interaction Preference

- Reply Language: English(regardless of the language I use)
- Code Comment: English
- When additional information is needed, ask for it. Do NOT make assumptions.
- When conflict commands exist, require me to give out priority or the source of truth.
