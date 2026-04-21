# Architecture

**Next.js 16 App Router** project. Source lives under `src/`.

## Directory layout

```
src/
├── app/                        # Next.js routes
│   ├── layout.tsx              # Root layout (Geist fonts, <Header />)
│   ├── page.tsx                # / → LandingPage
│   ├── auth/
│   │   ├── login/page.tsx      # /auth/login
│   │   ├── signup/page.tsx     # /auth/signup
│   │   └── callback/route.ts   # OAuth callback (Supabase code exchange)
│   ├── create/page.tsx         # /create?id=... → QAPage
│   ├── script/[id]/page.tsx    # /script/[id] → ScriptReviewPage
│   └── comic/[id]/page.tsx     # /comic/[id] → ComicViewerPage
└── frontend/                   # UI components, lib, tests
    ├── landing/
    ├── auth/
    ├── qa/
    ├── script-review/
    ├── comic-viewer/
    ├── ui/                     # Shared UI (Header)
    └── lib/
        ├── api.ts              # API client with mock fallback
        ├── types.ts            # Shared types & constants
        ├── auth.ts             # safeRedirect helper
        └── supabase-browser.ts # Browser Supabase client
```

## Pages & routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | LandingPage | Prompt input, art style, page count, "Surprise Me" |
| `/auth/login` | LoginPage | Email/password + Google OAuth |
| `/auth/signup` | SignupPage | Email/password + Google OAuth |
| `/create?id=...` | QAPage | Follow-up Q&A refinement |
| `/script/[id]` | ScriptReviewPage | Script review, edit, regenerate, mode selection |
| `/comic/[id]` | ComicViewerPage | Paginated comic viewer |

## API endpoints (consumed by `src/frontend/lib/api.ts`)

```
POST   /api/comic                        # Create comic
POST   /api/comic/random-idea            # Generate random idea
GET    /api/comic/[id]                   # Fetch comic
POST   /api/comic/[id]/refine            # Submit Q&A answers
POST   /api/comic/[id]/script/generate   # Generate script
POST   /api/comic/[id]/script/regenerate # Regenerate with feedback
PUT    /api/comic/[id]/approve           # Approve script + select mode
POST   /api/comic/[id]/generate-all      # Trigger image generation
```

Set `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local` to use mock implementations instead of a live backend.

## TypeScript

Strict mode. Path alias `@/*` resolves to `src/` (e.g. `@/frontend/lib/api`).

## Styling

Tailwind CSS v4 (imported via `@import "tailwindcss"` in `globals.css`, not the v3 plugin syntax). Design system: **Ink & Pop**.

CSS variables declared in `globals.css`:
- Colors: `--color-primary` (#6c3ce1 purple), `--color-secondary` (#ff6b35 orange), plus text/surface/border/muted/status tokens
- `--background` / `--foreground` for light/dark mode (`prefers-color-scheme`)
- `--font-sans` / `--font-mono` wired to Geist font variables

## ESLint

Flat config (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
