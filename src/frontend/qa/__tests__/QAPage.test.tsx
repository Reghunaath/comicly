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
import QAPage from "../QAPage";

// ---------------------------------------------------------------------------
// Router mock
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/create",
}));

// ---------------------------------------------------------------------------
// Shared mock data (matches mockCreateComic questions in api.ts)
// ---------------------------------------------------------------------------

const MOCK_COMIC_ID = "test-comic-id";

const MOCK_QUESTIONS = [
  { id: "q1", question: "Who is the main character and what drives them?" },
  { id: "q2", question: "What is the central conflict or challenge?" },
  { id: "q3", question: "What tone should the story have — lighthearted or serious?" },
];

function mockComic(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_COMIC_ID,
    userId: null,
    status: "input",
    createdAt: "2026-04-15T00:00:00Z",
    updatedAt: "2026-04-15T00:00:00Z",
    prompt: "A detective cat solves mysteries",
    artStyle: "manga",
    pageCount: 5,
    followUpQuestions: MOCK_QUESTIONS,
    pages: [],
    currentPageIndex: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MSW server — default happy-path handlers
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get("/api/comic/:id", ({ params }) =>
    HttpResponse.json({ comic: mockComic({ id: params.id as string }) })
  ),
  http.post("/api/comic/:id/refine", () =>
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
  render(<QAPage comicId={MOCK_COMIC_ID} />);
  return { user };
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe("Rendering", () => {
  it("shows a loading spinner before questions are fetched", () => {
    setup();
    expect(screen.getByRole("status", { name: /loading questions/i })).toBeInTheDocument();
  });

  it("renders all 3 questions after fetch resolves", async () => {
    setup();
    for (const q of MOCK_QUESTIONS) {
      expect(await screen.findByText(q.question)).toBeInTheDocument();
    }
  });

  it("renders Skip All and Submit buttons", async () => {
    setup();
    expect(await screen.findByRole("button", { name: /skip all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Question display
// ---------------------------------------------------------------------------

describe("Question display", () => {
  it("renders one text input per question", async () => {
    setup();
    await screen.findByText(MOCK_QUESTIONS[0].question);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(MOCK_QUESTIONS.length);
  });

  it("inputs are not required (no required attribute)", async () => {
    setup();
    await screen.findByText(MOCK_QUESTIONS[0].question);
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).not.toHaveAttribute("required");
    }
  });

  it("shows a fallback message when comic has no follow-up questions", async () => {
    server.use(
      http.get("/api/comic/:id", ({ params }) =>
        HttpResponse.json({ comic: mockComic({ id: params.id as string, followUpQuestions: [] }) })
      )
    );
    setup();
    expect(
      await screen.findByText(/no follow-up questions/i)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Skip All
// ---------------------------------------------------------------------------

describe("Skip All", () => {
  it("calls POST /refine with empty answers and navigates to /script/:id", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("/api/comic/:id/refine", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const { user } = setup();
    await screen.findByRole("button", { name: /skip all/i });
    await user.click(screen.getByRole("button", { name: /skip all/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({ answers: {} });
      expect(mockPush).toHaveBeenCalledWith(`/script/${MOCK_COMIC_ID}`);
    });
  });

  it("submits empty answers even when some inputs are filled", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("/api/comic/:id/refine", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const { user } = setup();
    await screen.findByText(MOCK_QUESTIONS[0].question);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Some answer");

    await user.click(screen.getByRole("button", { name: /skip all/i }));
    await waitFor(() => {
      expect(capturedBody).toMatchObject({ answers: {} });
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Submit
// ---------------------------------------------------------------------------

describe("Submit", () => {
  it("calls POST /refine with filled answers and navigates to /script/:id", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("/api/comic/:id/refine", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const { user } = setup();
    await screen.findByText(MOCK_QUESTIONS[0].question);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Inspector Whiskers");
    await user.type(inputs[1], "A stolen clockwork diamond");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        answers: {
          q1: "Inspector Whiskers",
          q2: "A stolen clockwork diamond",
        },
      });
      expect(mockPush).toHaveBeenCalledWith(`/script/${MOCK_COMIC_ID}`);
    });
  });

  it("navigates to /script/:id even when all inputs are left empty", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /submit/i });
    await user.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/script/${MOCK_COMIC_ID}`);
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Loading state
// ---------------------------------------------------------------------------

describe("Loading state", () => {
  it("disables Skip All and Submit while POST /refine is in-flight", async () => {
    let resolvePost!: (value: Response) => void;
    server.use(
      http.post("/api/comic/:id/refine", () =>
        new Promise<Response>((res) => {
          resolvePost = res;
        })
      )
    );

    const { user } = setup();
    await screen.findByRole("button", { name: /submit/i });

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /skip all/i })).toBeDisabled();

    // Unblock the request so cleanup doesn't hang
    resolvePost(
      HttpResponse.json({ success: true }) as unknown as Response
    );
  });

  it("inputs are disabled while POST /refine is in-flight", async () => {
    let resolvePost!: (value: Response) => void;
    server.use(
      http.post("/api/comic/:id/refine", () =>
        new Promise<Response>((res) => {
          resolvePost = res;
        })
      )
    );

    const { user } = setup();
    await screen.findByText(MOCK_QUESTIONS[0].question);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    for (const input of screen.getAllByRole("textbox")) {
      expect(input).toBeDisabled();
    }

    resolvePost(
      HttpResponse.json({ success: true }) as unknown as Response
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Error — 404 on fetch
// ---------------------------------------------------------------------------

describe("Error — 404 on fetch", () => {
  it("shows an error state when the comic is not found", async () => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ error: "Comic not found" }, { status: 404 })
      )
    );

    setup();
    expect(
      await screen.findByText(/couldn't load your comic/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/comic not found/i)).toBeInTheDocument();
  });

  it("shows a Go back link when fetch fails", async () => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ error: "Comic not found" }, { status: 404 })
      )
    );

    setup();
    const link = await screen.findByRole("link", { name: /go back/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("does not render the question form on fetch error", async () => {
    server.use(
      http.get("/api/comic/:id", () =>
        HttpResponse.json({ error: "Comic not found" }, { status: 404 })
      )
    );

    setup();
    await screen.findByText(/couldn't load your comic/i);
    expect(screen.queryByRole("button", { name: /skip all/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Error — POST /refine 500
// ---------------------------------------------------------------------------

describe("Error — POST /refine failure", () => {
  it("shows an inline error message when POST /refine returns 500", async () => {
    server.use(
      http.post("/api/comic/:id/refine", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await screen.findByRole("button", { name: /submit/i });
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      await screen.findByText(/failed to submit answers/i)
    ).toBeInTheDocument();
  });

  it("re-enables buttons after a POST /refine error", async () => {
    server.use(
      http.post("/api/comic/:id/refine", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await screen.findByRole("button", { name: /submit/i });
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await screen.findByText(/failed to submit answers/i);

    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /skip all/i })).not.toBeDisabled();
  });

  it("does not navigate after a POST /refine error", async () => {
    server.use(
      http.post("/api/comic/:id/refine", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await screen.findByRole("button", { name: /submit/i });
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await screen.findByText(/failed to submit answers/i);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
