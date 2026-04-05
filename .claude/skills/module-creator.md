# Skill: Module Creator (v1)


## Purpose

Generate the correct Next.js App Router file structure for a new frontend page/module based on a given route path and intent. This skill encodes the routing conventions so that folder naming, nesting, and file selection are always correct.

------

## 1. Folder Naming Decision Tree

When creating a new route, the **first decision** is what kind of folder to use.

### Regular folder → `name/`

Creates a **URL segment**. The folder name becomes part of the URL path.

Use when:

- The route should be publicly accessible at that path
- The segment appears in the browser URL bar

```
app/blog/page.tsx           →  /blog
app/blog/[slug]/page.tsx    →  /blog/my-post
app/settings/page.tsx       →  /settings
```

### Route Group → `(name)/`

Parentheses make the folder **invisible in the URL**. It exists only for organizational purposes.

Use when:

- You need to group routes that share a layout but the group name should NOT appear in the URL
- You want to split your app into logical sections (e.g., marketing vs. dashboard) without affecting paths
- You need multiple root layouts within the same app

```
app/(marketing)/page.tsx         →  /           (NOT /marketing)
app/(marketing)/about/page.tsx   →  /about      (NOT /marketing/about)
app/(dashboard)/home/page.tsx    →  /home       (NOT /dashboard/home)
```

Common route group names and their intent:

| Group Name    | Purpose                                       |
| ------------- | --------------------------------------------- |
| `(marketing)` | Public-facing pages (landing, about, pricing) |
| `(dashboard)` | Authenticated app pages                       |
| `(auth)`      | Login, signup, forgot-password flows          |
| `(legal)`     | Terms, privacy, compliance pages              |
| `(api)`       | Grouping internal API routes (rare)           |

**Key rule**: If two route groups define the same URL path (e.g., both have `page.tsx` at `/`), Next.js will throw a build error. Ensure only one group owns each path.

### Dynamic segment → `[param]/`

Square brackets make the segment a **URL parameter** captured at runtime.

Use when:

- The path segment is variable (IDs, slugs, usernames)

```
app/users/[id]/page.tsx          →  /users/123      (params.id = "123")
app/blog/[slug]/page.tsx         →  /blog/hello      (params.slug = "hello")
```

### Catch-all segment → `[...param]/`

Captures **all remaining** segments as an array.

Use when:

- You need to match an arbitrary depth of nested paths (docs, file browsers)

```
app/docs/[...slug]/page.tsx      →  /docs/a/b/c     (params.slug = ["a","b","c"])
```

### Optional catch-all → `[[...param]]/`

Same as catch-all but **also matches the root** (no segments).

Use when:

- The base path (e.g., `/docs`) and all sub-paths should render the same page component

```
app/docs/[[...slug]]/page.tsx    →  /docs            (params.slug = undefined)
                                 →  /docs/a/b        (params.slug = ["a","b"])
```

### Parallel routes → `@slot/`

The `@` prefix defines a **named slot** rendered in parallel within the parent layout.

Use when:

- A single layout needs to render multiple independent page sections simultaneously (e.g., a dashboard with a main panel and a sidebar that each have their own loading/error states)

```
app/dashboard/@analytics/page.tsx
app/dashboard/@activity/page.tsx
app/dashboard/layout.tsx          ← receives { analytics, activity } as props
```

### Intercepted routes → `(.)name/`, `(..)name/`, `(..)(..)name/`, `(...)name/`

Intercepts a route from the current context (used for modals over lists, preview overlays).

| Convention | Matches           |
| ---------- | ----------------- |
| `(.)`      | Same level        |
| `(..)`     | One level up      |
| `(..)(..)` | Two levels up     |
| `(...)`    | From the app root |

Use when:

- Clicking an item in a list should open a modal/overlay while keeping the list visible
- The intercepted route should still be directly accessible as a full page via hard navigation

```
app/feed/@modal/(.)photo/[id]/page.tsx   ← modal overlay on soft nav
app/photo/[id]/page.tsx                  ← full page on hard nav / direct URL
```

------

## 2. File Selection Per Route

After choosing the folder structure, decide which **convention files** to include.

### Always include

| File       | Purpose                                                |
| ---------- | ------------------------------------------------------ |
| `page.tsx` | The route's UI. Required to make the route accessible. |

### Include when needed

| File            | When to include                                              |
| --------------- | ------------------------------------------------------------ |
| `layout.tsx`    | The route (and its children) need a shared wrapper (nav, sidebar, providers). |
| `loading.tsx`   | The page does async data fetching and needs a Suspense fallback. |
| `error.tsx`     | The page can fail and needs a local error boundary (must be `"use client"`). |
| `not-found.tsx` | Custom 404 UI specific to this route subtree.                |
| `template.tsx`  | Like layout but **re-mounts** on every navigation (rare — use for enter/exit animations, per-page analytics). |
| `default.tsx`   | Fallback for parallel route slots when the slot has no matching page for the current URL. |
| `route.ts`      | This path is an API endpoint, not a page. **Cannot coexist** with `page.tsx` in the same folder. |

### Decision aid

```
Is this an API endpoint?
  YES → route.ts only. No page.tsx.
  NO  ↓

Does this route share UI chrome with siblings?
  YES → Add layout.tsx in the parent.
  NO  ↓

Does the page fetch data on the server?
  YES → Add loading.tsx.
  NO  ↓

Can the page throw recoverable errors?
  YES → Add error.tsx ("use client").
  NO  → page.tsx is sufficient.
```

------

## 3. Templates

### 3a. Standard page route

Input: route path `/settings/profile`

```
app/
└── settings/
    └── profile/
        └── page.tsx
// app/settings/profile/page.tsx

export default function ProfilePage() {
  return <div>Profile</div>;
}
```

### 3b. Route group with shared layout

Input: marketing pages (`/`, `/about`, `/pricing`) sharing a navbar, separate from dashboard

```
app/
├── (marketing)/
│   ├── layout.tsx        ← marketing navbar + footer
│   ├── page.tsx          ← /
│   ├── about/
│   │   └── page.tsx      ← /about
│   └── pricing/
│       └── page.tsx      ← /pricing
└── (dashboard)/
    ├── layout.tsx        ← dashboard sidebar
    └── home/
        └── page.tsx      ← /home
// app/(marketing)/layout.tsx

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav>{/* marketing nav */}</nav>
      <main>{children}</main>
      <footer>{/* marketing footer */}</footer>
    </>
  );
}
```

### 3c. Dynamic route with loading and error handling

Input: blog post page at `/blog/:slug`

```
app/
└── blog/
    ├── page.tsx                ← /blog (list)
    └── [slug]/
        ├── page.tsx            ← /blog/:slug
        ├── loading.tsx
        └── error.tsx
// app/blog/[slug]/page.tsx

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <article>{post.content}</article>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title };
}
// app/blog/[slug]/loading.tsx

export default function Loading() {
  return <div>Loading post...</div>;
}
// app/blog/[slug]/error.tsx
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
      <p>Failed to load post.</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

### 3d. Intercepting route (modal pattern)

Input: photo feed where clicking a photo opens a modal, but `/photo/:id` is also a full page

```
app/
├── feed/
│   ├── page.tsx                    ← /feed (the list)
│   ├── @modal/
│   │   ├── (.)photo/
│   │   │   └── [id]/
│   │   │       └── page.tsx        ← modal on soft navigation
│   │   └── default.tsx             ← renders nothing when no modal is active
│   └── layout.tsx                  ← receives { children, modal } props
└── photo/
    └── [id]/
        └── page.tsx                ← /photo/:id full page (direct access)
// app/feed/layout.tsx

export default function FeedLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
// app/feed/@modal/default.tsx

export default function Default() {
  return null;
}
```

### 3e. API route

Input: endpoint at `/api/users`

```
app/
└── api/
    └── users/
        └── route.ts
// app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const data = await getUsers();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await createUser(body);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

------

## 4. Common Mistakes to Avoid

1. **`route.ts` and `page.tsx` in the same folder** — This is a build error. A path is either a page or an API endpoint, never both.
2. **Route group name in the URL** — `(marketing)` never appears in the URL. If a user says "I want the path to be `/marketing/about`", use a regular `marketing/` folder, not `(marketing)/`.
3. **Missing `default.tsx` for parallel slots** — If you use `@slot`, every slot must have a `default.tsx` to handle cases where the slot has no matching route. Without it, Next.js returns a 404.
4. **`error.tsx` without `"use client"`** — Error boundaries must be client components. This is easy to forget and causes a build error.
5. **Conflicting route groups** — Two route groups both defining `page.tsx` at the same effective path will cause a build-time conflict. Each URL can only resolve to one page.
6. **Using `params` directly without awaiting** — In Next.js 15+, `params` is a Promise. Always `await params` before accessing its properties.

------

## 5. Quick Reference

```
Need it in the URL?
├── YES
│   ├── Fixed path      → regular folder:   name/
│   ├── Variable path   → dynamic segment:  [param]/
│   ├── Variable depth  → catch-all:        [...param]/
│   └── Optional depth  → optional:         [[...param]]/
├── NO (organization only)
│   └── Route group:    (name)/
└── SPECIAL
    ├── Parallel slot:       @name/
    └── Interception:        (.)name/  or  (..)name/
```