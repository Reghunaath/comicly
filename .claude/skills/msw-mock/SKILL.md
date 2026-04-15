------

## name: msw-mock description: Write MSW v2 mock handlers for Comicly frontend component tests. Use this skill whenever writing or modifying test files under src/frontend/**/**tests**/ that need to intercept API calls.

# MSW Mock Writing Skill — Comicly Frontend

This skill guides writing `msw` v2 mock handlers for Comicly's Vitest + React Testing Library component tests. Follow every rule here precisely. Deviating introduces silent failures that are hard to debug.

------

## 0. Pre-flight Checklist

Before writing any handler, run this check:

```bash
# Confirm msw version — must be v2 (setupServer from msw/node, not msw/browser)
cat node_modules/msw/package.json | grep '"version"'

# Confirm dependencies exist
pnpm list msw @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest
```

If any dependency is missing: `pnpm add -D msw @testing-library/user-event @testing-library/jest-dom`

------

## 1. Canonical Server Setup

Every test file that mocks API calls uses this exact boilerplate. Do not vary the import paths or lifecycle hooks.

```typescript
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  // ... default happy-path handlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Rules:**

- `onUnhandledRequest: "warn"` — surfaces missing handlers without crashing tests
- `server.resetHandlers()` in `afterEach` — never `afterAll`. Handlers overridden with `server.use()` inside a test must be cleaned up immediately after.
- Never share a `server` instance across test files. Each file has its own.

------

## 2. Comicly API Handler Reference

These are the complete happy-path handlers for every Comicly endpoint. Include only the ones relevant to the component under test in the default `setupServer(...)` call.

### 2.1 Landing Page Handlers

```typescript
// GET /api/comic/random-idea
http.get("/api/comic/random-idea", () =>
  HttpResponse.json({ idea: "A robot learns to paint in a post-apocalyptic world" })
),

// POST /api/comic — Create comic
http.post("/api/comic", async ({ request }) => {
  const body = await request.json() as {
    prompt: string;
    artStyle: string;
    customStylePrompt: string | null;
    pageCount: number;
  };
  return HttpResponse.json(
    {
      comicId: "test-comic-id",
      followUpQuestions: [
        { id: "q1", question: "What is the robot's name?" },
        { id: "q2", question: "What kind of art does the robot paint?" },
      ],
    },
    { status: 201 }
  );
}),
```

### 2.2 Q&A Page Handlers

```typescript
// GET /api/comic/:id — fetch comic with follow-up questions
http.get("/api/comic/:id", ({ params }) =>
  HttpResponse.json({
    comic: {
      id: params.id,
      status: "input",
      prompt: "A robot learns to paint",
      artStyle: "manga",
      pageCount: 3,
      followUpQuestions: [
        { id: "q1", question: "What is the robot's name?" },
        { id: "q2", question: "What kind of art does the robot paint?" },
      ],
      followUpAnswers: {},
      pages: [],
      currentPageIndex: 0,
      createdAt: "2026-04-01T10:00:00Z",
      updatedAt: "2026-04-01T10:00:00Z",
    },
  })
),

// POST /api/comic/:id/refine — submit answers
http.post("/api/comic/:id/refine", () =>
  HttpResponse.json({ success: true })
),
```

### 2.3 Script Review Handlers

```typescript
// POST /api/comic/:id/script/generate
http.post("/api/comic/:id/script/generate", () =>
  HttpResponse.json({
    script: {
      title: "Test Comic Title",
      synopsis: "A short synopsis.",
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              description: "Wide shot of the scene.",
              dialogue: [{ speaker: "Hero", text: "Let's go." }],
              caption: null,
            },
          ],
        },
      ],
    },
  })
),

// POST /api/comic/:id/script/regenerate
http.post("/api/comic/:id/script/regenerate", () =>
  HttpResponse.json({
    script: {
      title: "Regenerated Title",
      synopsis: "A revised synopsis.",
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              description: "A new scene.",
              dialogue: [],
              caption: "Narration here.",
            },
          ],
        },
      ],
    },
  })
),

// PUT /api/comic/:id/approve
http.put("/api/comic/:id/approve", () =>
  HttpResponse.json({ success: true })
),

// POST /api/comic/:id/generate-all
http.post("/api/comic/:id/generate-all", () =>
  HttpResponse.json({
    comic: {
      id: "test-comic-id",
      status: "complete",
      pages: [
        {
          pageNumber: 1,
          versions: [{ imageUrl: "https://example.com/page1.png", generatedAt: "2026-04-01T12:00:00Z" }],
          selectedVersionIndex: 0,
        },
      ],
    },
  })
),
```

### 2.4 Supervised Mode Handlers

```typescript
// POST /api/comic/:id/page/generate
http.post("/api/comic/:id/page/generate", () =>
  HttpResponse.json({
    page: {
      pageNumber: 1,
      versions: [{ imageUrl: "https://example.com/page1-v0.png", generatedAt: "2026-04-01T12:00:00Z" }],
      selectedVersionIndex: 0,
    },
  })
),

// POST /api/comic/:id/page/regenerate
http.post("/api/comic/:id/page/regenerate", () =>
  HttpResponse.json({
    page: {
      pageNumber: 1,
      versions: [
        { imageUrl: "https://example.com/page1-v0.png", generatedAt: "2026-04-01T12:00:00Z" },
        { imageUrl: "https://example.com/page1-v1.png", generatedAt: "2026-04-01T12:01:00Z" },
      ],
      selectedVersionIndex: 0,
    },
  })
),

// PUT /api/comic/:id/page/select
http.put("/api/comic/:id/page/select", () =>
  HttpResponse.json({ success: true })
),
```

### 2.5 Library Handlers

```typescript
// GET /api/comic?library=true
http.get("/api/comic", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("library") === "true") {
    return HttpResponse.json({
      comics: [
        {
          id: "comic-1",
          status: "complete",
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T11:00:00Z",
          title: "Inspector Whiskers",
          artStyle: "manga",
          pageCount: 5,
          thumbnailUrl: "https://example.com/thumb1.png",
        },
      ],
    });
  }
  return HttpResponse.json({ comics: [] });
}),
```

### 2.6 Comic Viewer & Delete Handlers

```typescript
// GET /api/comic/:id — complete comic for viewer
http.get("/api/comic/:id", ({ params }) =>
  HttpResponse.json({
    comic: {
      id: params.id,
      userId: "user-123",
      status: "complete",
      prompt: "A detective cat",
      artStyle: "manga",
      pageCount: 2,
      pages: [
        {
          pageNumber: 1,
          versions: [{ imageUrl: "https://example.com/page1.png", generatedAt: "2026-04-01T12:00:00Z" }],
          selectedVersionIndex: 0,
        },
        {
          pageNumber: 2,
          versions: [{ imageUrl: "https://example.com/page2.png", generatedAt: "2026-04-01T12:01:00Z" }],
          selectedVersionIndex: 0,
        },
      ],
      currentPageIndex: 0,
      script: { title: "Inspector Whiskers", synopsis: "...", pages: [] },
      createdAt: "2026-04-01T10:00:00Z",
      updatedAt: "2026-04-01T12:01:00Z",
    },
  })
),

// DELETE /api/comic/:id
http.delete("/api/comic/:id", () =>
  HttpResponse.json({ success: true })
),
```

------

## 3. Error Override Patterns

Use `server.use()` inside a single test to override a handler for that test only. `afterEach` + `server.resetHandlers()` reverts it automatically.

```typescript
// Pattern A — HTTP error response
it("shows error when POST /api/comic fails", async () => {
  server.use(
    http.post("/api/comic", () =>
      HttpResponse.json({ error: "Internal server error" }, { status: 500 })
    )
  );
  // ... render and assert error message
});

// Pattern B — Network failure (no response)
it("shows error on network failure", async () => {
  server.use(
    http.get("/api/comic/random-idea", () => {
      throw new TypeError("Failed to fetch");
    })
  );
  // ... render and assert error message
});

// Pattern C — 401 Unauthorized
it("redirects to login when library fetch returns 401", async () => {
  server.use(
    http.get("/api/comic", () =>
      HttpResponse.json({ error: "Authentication required to view library" }, { status: 401 })
    )
  );
  // ... assert redirect
});

// Pattern D — 400 Validation error
it("shows regen limit error on 4th regeneration", async () => {
  server.use(
    http.post("/api/comic/:id/page/regenerate", () =>
      HttpResponse.json(
        { error: "Maximum regeneration limit (3) reached for this page." },
        { status: 400 }
      )
    )
  );
  // ... assert counter and button disabled
});
```

------

## 4. Loading State Testing

To assert loading state, delay the response using a `Promise`:

```typescript
it("disables Submit button while POST is in-flight", async () => {
  let resolve!: () => void;
  const blocker = new Promise<void>((res) => { resolve = res; });

  server.use(
    http.post("/api/comic", async () => {
      await blocker;
      return HttpResponse.json({ comicId: "test-id", followUpQuestions: [] }, { status: 201 });
    })
  );

  render(<LandingPage />);
  await userEvent.type(screen.getByRole("textbox"), "My comic idea");
  await userEvent.click(screen.getByRole("button", { name: /create comic/i }));

  // Assert loading state before resolving
  expect(screen.getByRole("button", { name: /create comic/i })).toBeDisabled();

  // Resolve and clean up
  resolve();
});
```

------

## 5. Request Body Assertion

When a test must verify the exact payload sent to the API:

```typescript
it("sends correct payload shape to POST /api/comic", async () => {
  let capturedBody: unknown;

  server.use(
    http.post("/api/comic", async ({ request }) => {
      capturedBody = await request.json();
      return HttpResponse.json({ comicId: "test-id", followUpQuestions: [] }, { status: 201 });
    })
  );

  render(<LandingPage />);
  await userEvent.type(screen.getByRole("textbox"), "My comic idea");
  // ... select art style, set page count
  await userEvent.click(screen.getByRole("button", { name: /create comic/i }));

  await waitFor(() => {
    expect(capturedBody).toEqual({
      prompt: "My comic idea",
      artStyle: "manga",           // whatever was selected
      customStylePrompt: null,
      pageCount: 3,
    });
  });
});
```

------

## 6. Supabase Auth Mock

Do NOT mock Supabase via msw (it uses its own SDK, not raw fetch). Mock the module directly:

```typescript
// At the top of each test file that needs auth state
vi.mock("@/frontend/lib/supabase-browser", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));
```

For unauthenticated state (library redirect tests):

```typescript
vi.mock("@/frontend/lib/supabase-browser", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}));
```

------

## 7. Next.js Router Mock

Always mock `next/navigation`, never `next/router` (this is App Router):

```typescript
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("id=test-comic-id"),
  usePathname: () => "/",
}));

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});
```

------

## 8. Common Mistakes to Avoid

| Mistake                                                 | Correct approach                                             |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `import { setupServer } from "msw/browser"`             | Use `msw/node` in test files                                 |
| `vi.fn()` to mock `global.fetch`                        | Use msw handlers — never mock fetch directly                 |
| `server.resetHandlers()` in `afterAll`                  | Must be in `afterEach`                                       |
| Asserting response body in handler (instead of request) | Capture request body via `capturedBody = await request.json()` |
| `fireEvent.click(button)`                               | Use `await userEvent.click(button)` — simulates real browser events |
| `screen.getByText("Create Comic")` for buttons          | Use `screen.getByRole("button", { name: /create comic/i })`  |
| Forgetting `await` on `userEvent` calls                 | All `userEvent` methods return Promises; always `await`      |
| Checking router.push before API resolves                | Wrap in `await waitFor(() => expect(mockPush).toHaveBeenCalledWith(...))` |
| Sharing msw server across test files                    | Each test file creates its own `setupServer` instance        |
| Mocking Supabase client via msw                         | Mock the module with `vi.mock("@/frontend/lib/supabase-browser", ...)` |

------

## 9. Full File Template

Minimal working test file with all boilerplate in place:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { vi } from "vitest";
import "@testing-library/jest-dom";

// Component under test
import LandingPage from "@/frontend/landing/LandingPage";

// Router mock
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// MSW server
const server = setupServer(
  http.get("/api/comic/random-idea", () =>
    HttpResponse.json({ idea: "A robot learns to paint" })
  ),
  http.post("/api/comic", () =>
    HttpResponse.json({ comicId: "test-comic-id", followUpQuestions: [] }, { status: 201 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
beforeEach(() => mockPush.mockClear());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("LandingPage", () => {
  it("renders the prompt textarea", () => {
    render(<LandingPage />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // ... other tests
});
```

## 10 Handler Refactor

After completing required handlers, scan all other existing handlers and refactor handlers that does not meet the requirement of this SKILL. Remove duplicate handlers.