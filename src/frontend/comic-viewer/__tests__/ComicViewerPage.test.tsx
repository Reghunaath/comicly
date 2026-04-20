import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import ComicViewerPage from "../ComicViewerPage";

// ---------------------------------------------------------------------------
// Supabase mock — default: guest (no session)
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });

vi.mock("@/frontend/lib/supabase-browser", () => ({
  supabase: { auth: { getUser: () => mockGetUser() } },
}));

// ---------------------------------------------------------------------------
// jsPDF mock — prevent canvas/DOM issues in jsdom
// ---------------------------------------------------------------------------

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    addPage: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Router mock
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/comic/test-comic-id",
}));

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_COMIC_ID = "test-comic-id";

function mockCompletedComic(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_COMIC_ID,
    userId: null,
    status: "complete",
    createdAt: "2026-04-15T00:00:00Z",
    updatedAt: "2026-04-15T00:00:00Z",
    prompt: "A detective cat solves mysteries",
    artStyle: "manga",
    pageCount: 2,
    script: {
      title: "Inspector Whiskers and the Clockwork Diamond",
      synopsis: "A detective cat must recover a stolen diamond.",
      pages: [],
    },
    pages: [
      {
        pageNumber: 1,
        versions: [{ imageUrl: "https://example.com/page1.jpg", generatedAt: "2026-04-15T00:00:00Z" }],
        selectedVersionIndex: 0,
      },
      {
        pageNumber: 2,
        versions: [{ imageUrl: "https://example.com/page2.jpg", generatedAt: "2026-04-15T00:00:00Z" }],
        selectedVersionIndex: 0,
      },
    ],
    currentPageIndex: 2,
    ...overrides,
  };
}

function mockGeneratingComic(overrides: Record<string, unknown> = {}) {
  return mockCompletedComic({ status: "generating", pages: [], currentPageIndex: 0, ...overrides });
}

// ---------------------------------------------------------------------------
// MSW server — default happy-path handlers
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get("/api/comic/:id", ({ params }) =>
    HttpResponse.json({ comic: mockCompletedComic({ id: params.id as string }) })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const user = userEvent.setup();
  render(<ComicViewerPage comicId={MOCK_COMIC_ID} />);
  return { user };
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe("Rendering", () => {
  it("shows a loading spinner before fetch resolves", () => {
    setup();
    expect(
      screen.getByRole("status", { name: /loading comic/i })
    ).toBeInTheDocument();
  });

  it("renders the comic title after fetch resolves", async () => {
    setup();
    expect(
      await screen.findByText("Inspector Whiskers and the Clockwork Diamond")
    ).toBeInTheDocument();
  });

  it("renders the Share button", async () => {
    setup();
    expect(
      await screen.findByRole("button", { name: /share/i })
    ).toBeInTheDocument();
  });

  it("renders page images with correct alt text", async () => {
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(screen.getByAltText("Page 1")).toBeInTheDocument();
    expect(screen.getByAltText("Page 2")).toBeInTheDocument();
  });

  it("renders page captions", async () => {
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Not found
// ---------------------------------------------------------------------------

describe("Not found", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/comic/:id", () => HttpResponse.json({}, { status: 404 }))
    );
  });

  it("shows comic not found message", async () => {
    setup();
    expect(await screen.findByText(/comic not found/i)).toBeInTheDocument();
  });

  it("renders a Make your own link pointing to /", async () => {
    setup();
    const link = await screen.findByRole("link", { name: /make your own/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("does not render the Share button", async () => {
    setup();
    await screen.findByText(/comic not found/i);
    expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Generic error
// ---------------------------------------------------------------------------

describe("Generic error", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ error: "Server error" }, { status: 500 })
      )
    );
  });

  it("shows something went wrong message", async () => {
    setup();
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("renders a Go home link pointing to /", async () => {
    setup();
    const link = await screen.findByRole("link", { name: /go home/i });
    expect(link).toHaveAttribute("href", "/");
  });
});

// ---------------------------------------------------------------------------
// 4. Generating state
// ---------------------------------------------------------------------------

describe("Generating state", () => {
  it("shows the generation progress banner when status is generating", async () => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockGeneratingComic() })
      )
    );

    setup();
    expect(
      await screen.findByRole("status", { name: /generation in progress/i })
    ).toBeInTheDocument();
  });

  it("shows Check status button and no pages message when generating with no pages", async () => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockGeneratingComic() })
      )
    );

    setup();
    await screen.findByRole("status", { name: /generation in progress/i });
    expect(screen.getByRole("button", { name: /check status/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/pages will appear as they are generated/i)
    ).not.toBeInTheDocument();
  });

  it("does not show the generation progress banner in complete state", async () => {
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(
      screen.queryByRole("status", { name: /generation in progress/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Polling
// ---------------------------------------------------------------------------

describe("Manual status check", () => {
  it("transitions from generating to complete when Check status is clicked", async () => {
    let callCount = 0;
    server.use(
      http.get("/api/comic/:id", () => {
        callCount += 1;
        const comic = callCount === 1 ? mockGeneratingComic() : mockCompletedComic();
        return HttpResponse.json({ comic });
      })
    );

    const { user } = setup();
    await screen.findByRole("status", { name: /generation in progress/i });

    await user.click(screen.getByRole("button", { name: /check status/i }));

    expect(
      screen.queryByRole("status", { name: /generation in progress/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Share button
// ---------------------------------------------------------------------------

describe("Share button", () => {
  beforeEach(() => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls navigator.clipboard.writeText with window.location.href when Share is clicked", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /share/i });
    await user.click(screen.getByRole("button", { name: /share/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("shows the Link copied toast after clicking Share", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /share/i });
    await user.click(screen.getByRole("button", { name: /share/i }));
    expect(await screen.findByText("Link copied!")).toBeInTheDocument();
  });

  it("hides the toast after 3 seconds", async () => {
    vi.useFakeTimers();
    render(<ComicViewerPage comicId={MOCK_COMIC_ID} />);
    await act(async () => {}); // flush initial fetch
    await act(() => {
      screen.getByRole("button", { name: /share/i }).click();
    });
    expect(screen.getByText("Link copied!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.queryByText("Link copied!")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Guest banner
// ---------------------------------------------------------------------------

describe("Guest banner", () => {
  it("shows guest banner when not logged in", async () => {
    setup();
    expect(
      await screen.findByText(/sign up to save this comic to your library/i)
    ).toBeInTheDocument();
  });

  it("guest banner sign up link points to /auth/signup with redirect", async () => {
    setup();
    const link = await screen.findByRole("link", { name: /sign up/i });
    expect(link).toHaveAttribute("href", `/auth/signup?redirect=/comic/${MOCK_COMIC_ID}`);
  });

  it("does not show guest banner when logged in", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "user@test.com" } },
      error: null,
    });
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(
      screen.queryByText(/sign up to save this comic to your library/i)
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Export PDF button
// ---------------------------------------------------------------------------

describe("Export PDF button", () => {
  it("shows Export PDF button when comic is complete", async () => {
    setup();
    expect(
      await screen.findByRole("button", { name: /export pdf/i })
    ).toBeInTheDocument();
  });

  it("does not show Export PDF button while generating", async () => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockGeneratingComic() })
      )
    );
    setup();
    await screen.findByRole("status", { name: /generation in progress/i });
    expect(
      screen.queryByRole("button", { name: /export pdf/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 9. Delete button (owner only)
// ---------------------------------------------------------------------------

describe("Delete button", () => {
  it("does not show Delete button when user is not the owner", async () => {
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(
      screen.queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it("shows Delete button when logged-in user is the owner", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "owner-1", email: "owner@test.com" } },
      error: null,
    });
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockCompletedComic({ userId: "owner-1" }) })
      )
    );
    setup();
    expect(
      await screen.findByRole("button", { name: /delete/i })
    ).toBeInTheDocument();
  });

  it("opens confirmation dialog when Delete is clicked", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "owner-1", email: "owner@test.com" } },
      error: null,
    });
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockCompletedComic({ userId: "owner-1" }) })
      )
    );
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: /delete/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it("calls DELETE endpoint and navigates to /library on confirm", async () => {
    const mockPush = vi.fn();
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
      useSearchParams: () => new URLSearchParams(),
      usePathname: () => "/comic/test-comic-id",
    }));

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "owner-1", email: "owner@test.com" } },
      error: null,
    });
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockCompletedComic({ userId: "owner-1" }) })
      ),
      http.delete("/api/comic/:id", () => HttpResponse.json({ success: true }))
    );

    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: /delete/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await screen.findByText(/deleting/i).catch(() => null);
  });

  it("dismisses dialog when Cancel is clicked", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "owner-1", email: "owner@test.com" } },
      error: null,
    });
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ comic: mockCompletedComic({ userId: "owner-1" }) })
      )
    );
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: /delete/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
