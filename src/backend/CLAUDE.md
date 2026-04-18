# Backend — CLAUDE.md

Owner: **Reghu**. This directory (`src/backend/`) contains all server-side logic for Comicly. The only other backend files are the thin route handlers in `src/app/api/`.

---

## The One Rule: Thin Routes

`src/app/api/` files contain **no business logic**. They receive the request, call one handler function, and return the response. All logic lives in `src/backend/handlers/`.

```typescript
// src/app/api/comic/route.ts  — CORRECT
import { NextRequest, NextResponse } from "next/server";
import { createComic } from "@/backend/handlers/create-comic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await createComic(body);
  return NextResponse.json(result, { status: 201 });
}
```

```typescript
// src/app/api/comic/route.ts  — WRONG: logic in the route file
export async function POST(req: NextRequest) {
  const body = await req.json();
  const comic = await supabase.from("comics").insert({ ... }); // ❌
  ...
}
```

---

## Directory Structure

```
src/backend/
├── lib/
│   ├── types.ts              # Canonical types — shared contract with frontend
│   ├── constants.ts          # MAX_PAGES, art style presets, image config
│   ├── db.ts                 # All DB query functions (uses supabaseAdmin)
│   ├── supabase/
│   │   ├── server.ts         # createRequestClient() + supabaseAdmin
│   │   ├── middleware.ts     # getOptionalUser() + getRequiredUser()
│   │   └── storage.ts        # uploadImage(), deleteComicImages()
│   └── ai/
│       ├── gemini-client.ts  # GoogleGenAI singleton
│       ├── prompts.ts        # All prompt template functions
│       ├── script-generator.ts
│       └── image-generator.ts
└── handlers/                 # One file per route group
    ├── create-comic.ts
    ├── get-comic.ts
    ├── random-idea.ts
    ├── refine-comic.ts
    ├── generate-script.ts
    ├── regenerate-script.ts
    ├── approve-comic.ts
    ├── generate-all.ts
    ├── generate-page.ts
    ├── regenerate-page.ts
    ├── select-page.ts
    ├── delete-comic.ts
    └── get-library.ts
```

---

## Supabase Clients — Which to Use When

| Situation | Client | Why |
|-----------|--------|-----|
| Any write to DB (insert, update, upsert, delete) | `supabaseAdmin` | Bypasses RLS; backend owns all writes |
| Reading the authenticated user from a request | `createRequestClient()` | Reads session cookie from the incoming request |
| Reading DB data in a handler | `supabaseAdmin` | Simpler; RLS is permissive for reads anyway |

Never use `supabaseAdmin` on the client side. Never use `createBrowserClient` in backend code.

---

## Auth Helpers

```typescript
import { getOptionalUser, getRequiredUser } from "@/backend/lib/supabase/middleware";

// Returns the user or null — for routes that work with or without auth
const user = await getOptionalUser();

// Returns the user or throws "AUTH_REQUIRED" — for protected routes
const user = await getRequiredUser();
```

**Which routes require auth:**

| Route | Auth |
|-------|------|
| Create comic, all pipeline steps, view comic | Optional (`getOptionalUser`) |
| Get library | Required |
| Delete comic | Required + ownership check |

---

## Types Contract

`src/backend/lib/types.ts` is the **source of truth**. The frontend mirrors it in `src/frontend/lib/types.ts`. If you change the backend types, tell Qingyang so the frontend mirror stays in sync.

**Import types in handler/lib code from:**
```typescript
import type { Comic, ComicStatus, Script } from "@/backend/lib/types";
```

---

## AI Output — Always Validate

Gemini text calls return JSON. Never trust the raw output:

1. Use `JSON.parse()` inside a `try/catch`.
2. On parse failure, retry once with a correction prompt ("Your previous response was not valid JSON...").
3. After parsing, validate the structure (correct page count, panel count, required fields) before saving to DB.

---

## Environment Variables

| Variable | Where it's safe |
|----------|----------------|
| `GEMINI_API_KEY` | Server-side only. Never in client components. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only. Never in client components. |
| `NEXT_PUBLIC_SUPABASE_URL` | Safe everywhere |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe everywhere |
| `NEXT_PUBLIC_BASE_URL` | Safe everywhere |

Any variable without `NEXT_PUBLIC_` is automatically server-only in Next.js. Keep it that way.

---

## Adding a New Route — Checklist

1. Create `src/backend/handlers/<name>.ts` with the handler function.
2. Create the thin route file in `src/app/api/comic/[id]/<endpoint>/route.ts`.
3. The route file: parse request → call handler → return `NextResponse.json(...)`.
4. Error responses use `{ error: string }` with an appropriate HTTP status.
5. For long-running routes (image generation), add `export const maxDuration = 300;` to the route file.
6. Add the new endpoint to the Swagger spec in `src/app/api/docs/route.ts`.

---

## Error Response Shape

```typescript
// All errors follow this shape
return NextResponse.json({ error: "Human-readable message" }, { status: 400 });
```

Status codes: 200/201 success, 400 bad request / validation, 401 not authenticated, 403 not owner, 404 not found, 500 unexpected.

---

## PRD Reference

Full API contracts, DB schema, AI prompts, and sequence diagrams are in:
`references/comicly-technical-prd.md` — Sections 4 (Auth), 5 (Data Models), 6 (API Contract), 7 (AI Pipeline), 9 (Storage).

---

## Working Preferences

### PRD Is the Source of Truth
- Follow `references/comicly-technical-prd.md` exactly. Do not add endpoints, fields, or behaviour not described in it.
- **⚠️ If you need to deviate from the PRD for any reason (technical limitation, ambiguity, better approach), STOP and flag it in bold before proceeding. Never silently deviate.**
- **⚠️ If any requirement is unclear or missing detail, ASK before implementing. Do not guess.**

### Issue Build Order

Branch naming: `reghu/<feature-slug>` — one branch per issue, merge to `main` via PR.

**Sprint 1 — Foundation and Core Loop**
```
#9  Project scaffolding and Supabase setup          ← start here    reghu/project-setup
#10 CLAUDE.md and Claude Code tooling setup                          reghu/claude-md-setup
#11 Gemini client and AI pipeline foundation        ← depends on #9  reghu/ai-pipeline
#12 Database query layer and storage helpers        ← depends on #9  reghu/db-layer
#13 Comic creation and random idea API routes       ← depends on #11, #12  reghu/comic-creation-api
#14 Refine, script generation, and approve routes   ← depends on #13  reghu/script-api
#15 Automated mode generation and comic retrieval   ← depends on #14  reghu/automated-generation
```

**Sprint 2 — Auth, Creative Control, and Library**
```
#20 Supabase Auth setup and middleware                               reghu/auth-setup
#21 Script regeneration API                                          reghu/script-regeneration
#22 Supervised mode API routes                                       reghu/supervised-mode
#23 Library API and delete endpoint                 ← depends on #20  reghu/library-api
#24 PDF export API route                            ← low priority   reghu/pdf-export
```

**Sprint 3 — Testing, Security, CI/CD**
```
#31 Backend unit and integration tests (TDD)                         reghu/backend-tests
#32 Input validation with Zod                                        reghu/input-validation
#33 CI/CD pipeline                                                   reghu/ci-pipeline
#34 Security hardening                                               reghu/security-hardening
```

### Scope — Backend Only
- Reghu owns backend only. Do not touch frontend code (`src/frontend/`, `src/app/(pages)/`).
- Work is structured issue by issue (GitHub issues #9–#34 are Reghu's backend issues).

### Issue-by-Issue Workflow
1. Before starting an issue: create the branch, then brief Reghu on what will be built (files, functions, tests). Wait for his explicit go-ahead before writing any code.
2. Implement the issue completely.
3. Stop and summarise what was built. Wait for Reghu's explicit confirmation.
4. Only after confirmation: commit all changes for that issue.
5. Push the branch to remote.
6. Only after pushing: move to the next issue. Do not chain issues autonomously.

### Commit After Each Approved Issue
- Commit message must reference the issue number: `feat(backend): ... (#<issue-number>)`
- Do not commit until Reghu explicitly approves the implementation.

### Code Quality
- All code must be TypeScript. No `.js` files.
- Never use `any` unless absolutely necessary. When you must, add a comment explaining why.
- Every API request body, response shape, and DB model must have an explicit interface or type. No untyped plain objects passed between functions.
- Run `npm run lint` before considering any task done.

### No Scope Creep
- Do not implement anything not in the PRD — no extra endpoints, no unrequested fields, no "nice to haves".

### Every Handler Must Be Complete
- Every handler must cover all outcomes: success, validation failure, not found, auth error, and unexpected error. No half-finished error handling.
