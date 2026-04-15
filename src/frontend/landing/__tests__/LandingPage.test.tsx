import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { beforeAll, afterEach, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "../LandingPage";

// ---------------------------------------------------------------------------
// Router mock
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// ---------------------------------------------------------------------------
// MSW server — default happy-path handlers
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get("/api/comic/random-idea", () =>
    HttpResponse.json({ idea: "A robot learns to paint" })
  ),
  http.post("/api/comic", async ({ request }) => {
    const body = await request.json();
    void body;
    return HttpResponse.json(
      { comicId: "test-comic-id", followUpQuestions: [] },
      { status: 201 }
    );
  })
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
  render(<LandingPage />);
  return { user };
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe("Rendering", () => {
  it("renders prompt textarea", () => {
    setup();
    expect(
      screen.getByRole("textbox", { name: /what.*comic idea/i })
    ).toBeInTheDocument();
  });

  it("renders all 6 art style cards", () => {
    setup();
    const styleNames = [
      "Manga",
      "Western Comic",
      "Watercolor Storybook",
      "Minimalist / Flat",
      "Vintage Newspaper",
      "Custom",
    ];
    for (const name of styleNames) {
      expect(
        screen.getByRole("button", { name: new RegExp(name, "i") })
      ).toBeInTheDocument();
    }
  });

  it("renders the page count slider", () => {
    setup();
    expect(
      screen.getByRole("slider", { name: /number of pages/i })
    ).toBeInTheDocument();
  });

  it("renders Surprise Me button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /surprise me/i })
    ).toBeInTheDocument();
  });

  it("renders Create Comic button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /create comic/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Art Style Selection
// ---------------------------------------------------------------------------

describe("Art Style Selection", () => {
  it("Manga is selected by default (aria-pressed=true)", () => {
    setup();
    // Selected card name includes the ✓ badge text, so use substring match
    expect(
      screen.getByRole("button", { name: /manga/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a different style card marks it as selected", async () => {
    const { user } = setup();
    const westernCard = screen.getByRole("button", { name: /western comic/i });
    await user.click(westernCard);
    expect(westernCard).toHaveAttribute("aria-pressed", "true");
    // After clicking Western, Manga is deselected — its name no longer starts with ✓
    expect(
      screen.getByRole("button", { name: /^manga/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking Custom reveals the custom style text input", async () => {
    const { user } = setup();
    expect(
      screen.queryByRole("textbox", { name: /describe your style/i })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^custom/i }));

    expect(
      screen.getByRole("textbox", { name: /describe your style/i })
    ).toBeInTheDocument();
  });

  it("selecting a non-custom style after custom hides the custom input", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /^custom/i }));
    expect(
      screen.getByRole("textbox", { name: /describe your style/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^manga/i }));
    expect(
      screen.queryByRole("textbox", { name: /describe your style/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Surprise Me
// ---------------------------------------------------------------------------

describe("Surprise Me", () => {
  it("clicking Surprise Me calls GET /api/comic/random-idea and populates the textarea", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /surprise me/i }));
    const textarea = await screen.findByRole("textbox", {
      name: /what.*comic idea/i,
    });
    expect(textarea).toHaveValue("A robot learns to paint");
  });

  it("does not crash when GET /api/comic/random-idea returns an error", async () => {
    server.use(
      http.get("/api/comic/random-idea", () =>
        HttpResponse.json({ error: "Internal Server Error" }, { status: 500 })
      )
    );
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /surprise me/i }));
    // Button re-enables after the silent failure
    await screen.findByRole("button", { name: /surprise me/i });
    expect(
      screen.getByRole("button", { name: /surprise me/i })
    ).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 4. Form Validation
// ---------------------------------------------------------------------------

describe("Form Validation", () => {
  it("shows a validation error and does not call POST /api/comic when prompt is empty", async () => {
    let postCalled = false;
    server.use(
      http.post("/api/comic", () => {
        postCalled = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /create comic/i }));

    expect(
      await screen.findByText(/please describe your comic idea/i)
    ).toBeInTheDocument();
    expect(postCalled).toBe(false);
  });

  it("shows a validation error when Custom style is selected but custom prompt is empty", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /^custom/i }));

    const promptTextarea = screen.getByRole("textbox", {
      name: /what.*comic idea/i,
    });
    await user.type(promptTextarea, "My comic idea");

    await user.click(screen.getByRole("button", { name: /create comic/i }));

    expect(
      await screen.findByText(/please describe your custom art style/i)
    ).toBeInTheDocument();
  });

  it("page count slider has min=1 and max=15", () => {
    setup();
    const slider = screen.getByRole("slider", { name: /number of pages/i });
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "15");
  });
});

// ---------------------------------------------------------------------------
// 5. Successful Submission
// ---------------------------------------------------------------------------

describe("Successful Submission", () => {
  it("POSTs with correct payload and calls router.push on 201", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("/api/comic", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          { comicId: "test-comic-id", followUpQuestions: [] },
          { status: 201 }
        );
      })
    );

    const { user } = setup();

    const textarea = screen.getByRole("textbox", {
      name: /what.*comic idea/i,
    });
    await user.type(textarea, "My test comic idea");

    // Manga is already selected by default; keep pageCount at default (5)
    await user.click(screen.getByRole("button", { name: /create comic/i }));

    await screen.findByRole("button", { name: /create comic/i });

    expect(capturedBody).toMatchObject({
      prompt: "My test comic idea",
      artStyle: "manga",
      pageCount: 5,
    });
    expect(mockPush).toHaveBeenCalledWith("/create?id=test-comic-id");
  });

  it("includes customStylePrompt in payload when Custom style is selected", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("/api/comic", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          { comicId: "test-comic-id", followUpQuestions: [] },
          { status: 201 }
        );
      })
    );

    const { user } = setup();

    await user.type(
      screen.getByRole("textbox", { name: /what.*comic idea/i }),
      "Space adventure"
    );
    await user.click(screen.getByRole("button", { name: /^custom/i }));
    await user.type(
      screen.getByRole("textbox", { name: /describe your style/i }),
      "Studio Ghibli pastel"
    );

    await user.click(screen.getByRole("button", { name: /create comic/i }));
    await screen.findByRole("button", { name: /create comic/i });

    expect(capturedBody).toMatchObject({
      prompt: "Space adventure",
      artStyle: "custom",
      customStylePrompt: "Studio Ghibli pastel",
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Loading State
// ---------------------------------------------------------------------------

describe("Loading State", () => {
  it("disables Create Comic button while POST /api/comic is in-flight", async () => {
    let resolvePost!: (value: Response) => void;
    server.use(
      http.post("/api/comic", () =>
        new Promise<Response>((res) => {
          resolvePost = res;
        })
      )
    );

    const { user } = setup();
    await user.type(
      screen.getByRole("textbox", { name: /what.*comic idea/i }),
      "Test idea"
    );

    await user.click(screen.getByRole("button", { name: /create comic/i }));

    expect(
      screen.getByRole("button", { name: /create comic/i })
    ).toBeDisabled();

    // Unblock the request so cleanup doesn't hang
    resolvePost(HttpResponse.json({ comicId: "x", followUpQuestions: [] }, { status: 201 }) as unknown as Response);
  });

  it("disables Surprise Me button while GET /api/comic/random-idea is in-flight", async () => {
    let resolveGet!: (value: Response) => void;
    server.use(
      http.get("/api/comic/random-idea", () =>
        new Promise<Response>((res) => {
          resolveGet = res;
        })
      )
    );

    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /surprise me/i }));

    expect(
      screen.getByRole("button", { name: /surprise me/i })
    ).toBeDisabled();

    // Unblock
    resolveGet(HttpResponse.json({ idea: "Done" }) as unknown as Response);
  });
});

// ---------------------------------------------------------------------------
// 7. Error Handling
// ---------------------------------------------------------------------------

describe("Error Handling", () => {
  it("shows an error message when POST /api/comic returns 500", async () => {
    server.use(
      http.post("/api/comic", async () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await user.type(
      screen.getByRole("textbox", { name: /what.*comic idea/i }),
      "Test idea"
    );
    await user.click(screen.getByRole("button", { name: /create comic/i }));

    expect(
      await screen.findByText(/internal server error/i)
    ).toBeInTheDocument();
  });

  it("form remains interactive after a POST /api/comic error", async () => {
    server.use(
      http.post("/api/comic", async () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await user.type(
      screen.getByRole("textbox", { name: /what.*comic idea/i }),
      "Test idea"
    );
    await user.click(screen.getByRole("button", { name: /create comic/i }));

    // Wait for error to appear
    await screen.findByText(/internal server error/i);

    // Button re-enables — user can retry
    expect(
      screen.getByRole("button", { name: /create comic/i })
    ).not.toBeDisabled();
    // Textarea is editable
    expect(
      screen.getByRole("textbox", { name: /what.*comic idea/i })
    ).not.toBeDisabled();
  });
});
