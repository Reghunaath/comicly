import { render, screen, waitFor } from "@testing-library/react";
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
import SupervisedReviewPage from "../SupervisedReviewPage";

// ---------------------------------------------------------------------------
// Router mock — stable object so useEffect([comicId, router]) doesn't re-fire
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
// Must start with "mock" so Vitest allows referencing it inside vi.mock factory.
const mockRouterObj = { push: mockPush, replace: vi.fn(), back: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouterObj,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/review/test-comic-id",
}));

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_COMIC_ID = "test-comic-id";

function mockVersion(seed: number) {
  return {
    imageUrl: `https://picsum.photos/seed/p1-v${seed}/800/1200`,
    generatedAt: `2026-04-15T00:0${seed}:00Z`,
  };
}

function mockComic(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_COMIC_ID,
    userId: null,
    status: "generating",
    generationMode: "supervised",
    createdAt: "2026-04-15T00:00:00Z",
    updatedAt: "2026-04-15T00:00:00Z",
    prompt: "A detective cat solves mysteries",
    artStyle: "manga",
    pageCount: 2,
    currentPageIndex: 0,
    pages: [
      {
        pageNumber: 1,
        versions: [mockVersion(0)],
        selectedVersionIndex: 0,
      },
    ],
    script: {
      title: "Inspector Whiskers",
      synopsis: "A cat detective.",
      pages: [],
    },
    ...overrides,
  };
}

function mockRegenPage(versionCount: number) {
  return {
    pageNumber: 1,
    versions: Array.from({ length: versionCount }, (_, i) => mockVersion(i)),
    selectedVersionIndex: versionCount - 1,
  };
}

// ---------------------------------------------------------------------------
// MSW server — default happy-path handlers
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get("/api/comic/:id", ({ params }) =>
    HttpResponse.json({ comic: mockComic({ id: params.id as string }) })
  ),
  http.post("/api/comic/:id/page/regenerate", () =>
    HttpResponse.json({ page: mockRegenPage(2) })
  ),
  http.put("/api/comic/:id/page/select", () =>
    HttpResponse.json({ success: true })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  mockPush.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const user = userEvent.setup();
  render(<SupervisedReviewPage comicId={MOCK_COMIC_ID} />);
  return { user };
}

async function openFeedbackPanel(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: /suggest changes/i });
  await user.click(screen.getByRole("button", { name: /suggest changes/i }));
}

// ---------------------------------------------------------------------------
// 1. Suggest Changes button
// ---------------------------------------------------------------------------

describe("Suggest Changes button", () => {
  it("renders 'Suggest Changes' button when a page has been generated", async () => {
    setup();
    expect(
      await screen.findByRole("button", { name: /suggest changes/i })
    ).toBeInTheDocument();
  });

  it("shows remaining regeneration count in the button label", async () => {
    setup();
    expect(
      await screen.findByRole("button", { name: /suggest changes \(3 left\)/i })
    ).toBeInTheDocument();
  });

  it("is disabled and shows 'Regeneration limit reached' when limit is exhausted", async () => {
    server.use(
      http.get("/api/comic/:id", ({ params }) =>
        HttpResponse.json({
          comic: mockComic({
            id: params.id as string,
            pages: [
              {
                pageNumber: 1,
                versions: [
                  mockVersion(0),
                  mockVersion(1),
                  mockVersion(2),
                  mockVersion(3),
                ],
                selectedVersionIndex: 0,
              },
            ],
          }),
        })
      )
    );

    setup();
    const btn = await screen.findByRole("button", {
      name: /regeneration limit reached/i,
    });
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 2. Feedback panel visibility
// ---------------------------------------------------------------------------

describe("Feedback panel", () => {
  it("reveals textarea and action buttons when 'Suggest Changes' is clicked", async () => {
    const { user } = setup();
    await openFeedbackPanel(user);

    expect(
      screen.getByRole("textbox", { name: /regeneration feedback/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^regenerate$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^cancel$/i })
    ).toBeInTheDocument();
  });

  it("hides the feedback panel and clears the textarea when Cancel is clicked", async () => {
    const { user } = setup();
    await openFeedbackPanel(user);

    const textarea = screen.getByRole("textbox", {
      name: /regeneration feedback/i,
    });
    await user.type(textarea, "Some notes");

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      screen.queryByRole("textbox", { name: /regeneration feedback/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Regeneration API calls
// ---------------------------------------------------------------------------

describe("Regeneration API calls", () => {
  it("POSTs { pageNumber } without feedback when textarea is empty", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/comic/:id/page/regenerate", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ page: mockRegenPage(2) });
      })
    );

    const { user } = setup();
    await openFeedbackPanel(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await waitFor(() =>
      expect(capturedBody).toEqual({ pageNumber: 1 })
    );
  });

  it("POSTs { pageNumber, feedback } when textarea has content", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/comic/:id/page/regenerate", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ page: mockRegenPage(2) });
      })
    );

    const { user } = setup();
    await openFeedbackPanel(user);

    await user.type(
      screen.getByRole("textbox", { name: /regeneration feedback/i }),
      "Make sky darker"
    );
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await waitFor(() =>
      expect(capturedBody).toEqual({
        pageNumber: 1,
        feedback: "Make sky darker",
      })
    );
  });

  it("hides the feedback panel and clears the textarea after successful regeneration", async () => {
    const { user } = setup();
    await openFeedbackPanel(user);

    await user.type(
      screen.getByRole("textbox", { name: /regeneration feedback/i }),
      "Some notes"
    );
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /regeneration feedback/i })
      ).not.toBeInTheDocument()
    );
    // "Suggest Changes" button re-appears (now 1 regeneration used)
    expect(
      await screen.findByRole("button", { name: /suggest changes/i })
    ).toBeInTheDocument();
  });

  it("shows an error message when the regeneration API call fails", async () => {
    server.use(
      http.post("/api/comic/:id/page/regenerate", () =>
        HttpResponse.json({ error: "AI service unavailable" }, { status: 503 })
      )
    );

    const { user } = setup();
    await openFeedbackPanel(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    expect(
      await screen.findByText(/ai service unavailable/i)
    ).toBeInTheDocument();
  });

  it("keeps Approve and feedback input visible after failed regeneration", async () => {
    server.use(
      http.post("/api/comic/:id/page/regenerate", () =>
        HttpResponse.json({ error: "AI service unavailable" }, { status: 503 })
      )
    );

    const { user } = setup();
    await openFeedbackPanel(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await screen.findByText(/ai service unavailable/i);

    expect(
      screen.getByRole("button", { name: /approve/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /regeneration feedback/i })
    ).toBeInTheDocument();
  });
});
