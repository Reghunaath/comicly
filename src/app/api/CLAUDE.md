# API Routes — CLAUDE.md

This directory contains **only** thin Next.js route handlers. No business logic here.

## The Pattern

```typescript
import { NextRequest, NextResponse } from "next/server";
import { myHandler } from "@/backend/handlers/my-handler";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await myHandler(body);
  return NextResponse.json(result, { status: 201 });
}
```

Each route file does exactly three things:
1. Parse the request (`req.json()`, `req.nextUrl.searchParams`, `params`)
2. Call one handler from `src/backend/handlers/`
3. Return a `NextResponse`

## Error Handling

Catch errors from the handler and return the standard error shape:

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await myHandler(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Long-Running Routes

For the `generate-all` route, export a max duration at the top of the file:

```typescript
export const maxDuration = 300; // requires Vercel Pro
```

## Route Map

```
api/comic/route.ts                        POST   create comic
api/comic/random-idea/route.ts            GET    random idea
api/comic/[id]/route.ts                   GET    get comic  |  DELETE  delete comic
api/comic/[id]/refine/route.ts            POST   submit follow-up answers
api/comic/[id]/script/generate/route.ts   POST   generate script
api/comic/[id]/script/regenerate/route.ts POST   regenerate script
api/comic/[id]/approve/route.ts           PUT    approve script + set mode
api/comic/[id]/generate-all/route.ts      POST   automated image generation
api/comic/[id]/page/generate/route.ts     POST   generate single page
api/comic/[id]/page/regenerate/route.ts   POST   regenerate a page
api/comic/[id]/page/select/route.ts       PUT    select page version
```

## Business Logic

All business logic lives in `src/backend/`. See `src/backend/CLAUDE.md` for conventions.

---

## Swagger Spec

Every route must appear in `src/app/api/docs/route.ts`. When a new route is created, add it to the `paths` object in that file before considering the route done. No exceptions.

## Working Preferences

### PRD Is the Source of Truth
- Only create routes listed in `references/comicly-technical-prd.md` Section 6.
- **⚠️ If anything needs to deviate from the PRD contract (method, path, request/response shape), STOP and flag it before proceeding.**
- **⚠️ If a route's contract is unclear, ASK before implementing. Do not guess.**

### Scope — Backend Only
- Reghu owns backend only. Do not touch frontend code.
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
- Never use `any`. Every request body and response must have an explicit type.
- Run `npm run lint` before considering any route done.

### Every Route Must Be Complete
- Every route must handle all outcomes: success, validation error, auth error (401/403), not found (404), and unexpected error (500). No partial error handling.
