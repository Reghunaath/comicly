---
name: route-file-creator
description: >
  Create Next.js App Router file structures from a route path and type (public/protected/admin).
  Use when adding new pages, dynamic routes, or route groups to the Next.js app/ directory.
user-invocable: true
---


# Skill: Route File Creator

Create Next.js App Router file structures from a route path.

---

## Input Format

Route path + page type descriptor:
- `public` — no auth, may need isolated layout
- `protected` — requires auth, inherits dashboard layout
- `admin` — requires admin role

Example: `/share/[token] public`

---

## Folder Type Rules

| Syntax | URL visible? | When to use |
|---|---|---|
| `name/` | Yes | Fixed URL segment |
| `[param]/` | Yes | Dynamic segment (IDs, slugs, tokens) |
| `(name)/` | No | Organize routes sharing a layout; name never appears in URL |

No other folder types (catch-all, parallel, intercepting) unless explicitly requested.

---

## File Rules

**Always create:** `page.tsx`

**Create when applicable:**

| File | Condition |
|---|---|
| `layout.tsx` | Route group root, or children share a wrapper (nav, sidebar, providers) |
| `loading.tsx` | Page does async data fetching |
| `error.tsx` | Page can fail recoverably. **Must** start with `"use client"` |
| `not-found.tsx` | Custom 404 needed for this subtree |

**Never** place `route.ts` and `page.tsx` in the same folder.

**Critical:** `"use client"` must be the very first line in `error.tsx`. No comments, no blank lines before it.
---

## Templates

### Standard page

```tsx
// app/{path}/page.tsx
export default function {Name}Page() {
  return <div>{Name}</div>;
}
```

### Layout (route group root)

```tsx
// app/(group)/layout.tsx
export default function {Group}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

### Dynamic page with loading + error

```tsx
// app/{path}/[param]/page.tsx
interface Props {
  params: Promise<{ param: string }>;
}

export default async function {Name}Page({ params }: Props) {
  const { param } = await params;
  return <div>{param}</div>;
}
```

```tsx
// app/{path}/[param]/loading.tsx
export default function Loading() {
  return <div>Loading...</div>;
}
```

```tsx
// app/{path}/[param]/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>Something went wrong.</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

### API route

```ts
// app/api/{path}/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ data: null });
}
```

---

## Execution Steps

Given a route path (e.g. `/comic/[id]`):

1. Parse each segment → choose folder type (regular, dynamic, or route group)
2. Determine which files are needed (page.tsx always; layout/loading/error per rules above)
3. Generate files using templates, replacing `{Name}` with PascalCase of the final segment
4. If the route belongs under an existing route group, place it there; do not create a new group
5. Print the created file tree as confirmation