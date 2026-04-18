import { render, screen, waitFor, act } from "@testing-library/react";
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
import ScriptReviewPage from "../ScriptReviewPage";

// ---------------------------------------------------------------------------
// Router mock
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/script/test-comic-id",
}));

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_COMIC_ID = "test-comic-id";

function mockScript() {
  return {
    title: "Inspector Whiskers and the Clockwork Diamond",
    synopsis: "A detective cat must recover a stolen diamond before dawn.",
    pages: [
      {
        pageNumber: 1,
        panels: [
          {
            panelNumber: 1,
            description: "Wide shot of a foggy steampunk city at night.",
            dialogue: [{ speaker: "Narrator", text: "The city never sleeps." }],
            caption: "A city of secrets.",
          },
          {
            panelNumber: 2,
            description: "Inspector Whiskers adjusts his monocle.",
            dialogue: [
              { speaker: "Inspector Whiskers", text: "A stolen diamond, you say?" },
            ],
          },
        ],
      },
      {
        pageNumber: 2,
        panels: [
          {
            panelNumber: 1,
            description: "Inspector Whiskers leaps across rooftops.",
            dialogue: [],
            caption: "No time to lose.",
          },
        ],
      },
    ],
  };
}

function mockRegenScript() {
  return {
    title: "Inspector Whiskers and the Clockwork Diamond (Revised)",
    synopsis: "[Revised] A detective cat must recover a stolen diamond before dawn.",
    pages: mockScript().pages,
  };
}

function mockComic(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_COMIC_ID,
    userId: null,
    status: "complete",
    createdAt: "2026-04-15T00:00:00Z",
    updatedAt: "2026-04-15T00:00:00Z",
    prompt: "A detective cat solves mysteries",
    artStyle: "manga",
    pageCount: 2,
    pages: [],
    currentPageIndex: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MSW server — default happy-path handlers
// ---------------------------------------------------------------------------

const server = setupServer(
  http.post("/api/comic/:id/script/generate", () =>
    HttpResponse.json({ script: mockScript() })
  ),
  http.post("/api/comic/:id/script/regenerate", () =>
    HttpResponse.json({ script: mockRegenScript() })
  ),
  http.put("/api/comic/:id/approve", () =>
    HttpResponse.json({ success: true })
  ),
  http.post("/api/comic/:id/generate-all", () =>
    HttpResponse.json({ success: true })
  ),
  http.get("/api/comic/:id", ({ params }) =>
    HttpResponse.json({ comic: mockComic({ id: params.id as string }) })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

beforeEach(() => {
  mockPush.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const user = userEvent.setup();
  render(<ScriptReviewPage comicId={MOCK_COMIC_ID} />);
  return { user };
}

async function selectAutomatedMode(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("radio", { name: /automated mode/i });
  await user.click(screen.getByRole("radio", { name: /automated mode/i }));
}

async function selectSupervisedMode(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("radio", { name: /supervised mode/i });
  await user.click(screen.getByRole("radio", { name: /supervised mode/i }));
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe("Rendering", () => {
  it("shows a loading spinner before script is generated", () => {
    setup();
    expect(
      screen.getByRole("status", { name: /generating script/i })
    ).toBeInTheDocument();
  });

  it("renders the script title after generate resolves", async () => {
    setup();
    expect(
      await screen.findByText("Inspector Whiskers and the Clockwork Diamond")
    ).toBeInTheDocument();
  });

  it("renders the synopsis", async () => {
    setup();
    expect(
      await screen.findByText(/must recover a stolen diamond/i)
    ).toBeInTheDocument();
  });

  it("renders mode selection cards after script loads", async () => {
    setup();
    await screen.findByRole("radio", { name: /automated mode/i });
    expect(screen.getByRole("radio", { name: /supervised mode/i })).toBeInTheDocument();
  });

  it("renders the Approve button disabled before mode is selected", async () => {
    setup();
    await screen.findByRole("radio", { name: /automated mode/i });
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeDisabled();
  });

  it("renders Edit and Regenerate buttons after script loads", async () => {
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^regenerate$/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Script display
// ---------------------------------------------------------------------------

describe("Script display", () => {
  it("renders page numbers", async () => {
    setup();
    await screen.findByText("Inspector Whiskers and the Clockwork Diamond");
    expect(screen.getByRole("region", { name: /page 1/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /page 2/i })).toBeInTheDocument();
  });

  it("renders panel descriptions", async () => {
    setup();
    expect(
      await screen.findByText(/wide shot of a foggy steampunk city/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/inspector whiskers adjusts his monocle/i)
    ).toBeInTheDocument();
  });

  it("renders dialogue lines with speaker names", async () => {
    setup();
    await screen.findByText(/the city never sleeps/i);
    expect(screen.getByText(/narrator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/inspector whiskers/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/a stolen diamond, you say\?/i)).toBeInTheDocument();
  });

  it("renders captions when present", async () => {
    setup();
    expect(await screen.findByText(/a city of secrets/i)).toBeInTheDocument();
    expect(screen.getByText(/no time to lose/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Approve & Generate flow (automated mode)
// ---------------------------------------------------------------------------

describe("Approve & Generate flow", () => {
  it("enables Approve & Generate button after selecting automated mode", async () => {
    const { user } = setup();
    await selectAutomatedMode(user);
    expect(
      screen.getByRole("button", { name: /approve & generate/i })
    ).not.toBeDisabled();
  });

  it("calls PUT /approve when Approve & Generate is clicked", async () => {
    let approveHit = false;
    server.use(
      http.put("/api/comic/:id/approve", () => {
        approveHit = true;
        return HttpResponse.json({ success: true });
      })
    );

    const { user } = setup();
    await selectAutomatedMode(user);
    await user.click(screen.getByRole("button", { name: /approve & generate/i }));

    await waitFor(() => expect(approveHit).toBe(true));
  });

  it("navigates to /comic/:id when polling detects status complete", async () => {
    vi.useFakeTimers();

    setup();
    await act(async () => {}); // flush generateScript promise

    // Use DOM .click() — userEvent hangs with fake timers due to internal async timers
    await act(async () => {
      screen.getByRole("radio", { name: /automated mode/i }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /approve & generate/i }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    await act(async () => {}); // flush polling promise

    expect(mockPush).toHaveBeenCalledWith(`/comic/${MOCK_COMIC_ID}`);
  });

  it("shows the progress banner after approve", async () => {
    vi.useFakeTimers();

    setup();
    await act(async () => {}); // flush generateScript promise

    await act(async () => {
      screen.getByRole("radio", { name: /automated mode/i }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /approve & generate/i }).click();
    });
    await act(async () => {}); // flush approve/generateAll promises

    expect(
      screen.getByRole("status", { name: /generation progress/i })
    ).toBeInTheDocument();
  });

  it("hides the Approve & Generate button during polling", async () => {
    vi.useFakeTimers();

    setup();
    await act(async () => {}); // flush generateScript promise

    await act(async () => {
      screen.getByRole("radio", { name: /automated mode/i }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /approve & generate/i }).click();
    });
    await act(async () => {}); // flush approve/generateAll promises

    expect(screen.getByRole("status", { name: /generation progress/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /approve & generate/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Supervised mode flow
// ---------------------------------------------------------------------------

describe("Supervised mode flow", () => {
  it("enables Approve button after selecting supervised mode", async () => {
    const { user } = setup();
    await selectSupervisedMode(user);
    expect(screen.getByRole("button", { name: /^approve$/i })).not.toBeDisabled();
  });

  it("navigates to /review/:id after approving in supervised mode", async () => {
    const { user } = setup();
    await selectSupervisedMode(user);
    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(`/review/${MOCK_COMIC_ID}`)
    );
  });

  it("does not call generate-all in supervised mode", async () => {
    let generateAllHit = false;
    server.use(
      http.post("/api/comic/:id/generate-all", () => {
        generateAllHit = true;
        return HttpResponse.json({ success: true });
      })
    );

    const { user } = setup();
    await selectSupervisedMode(user);
    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(`/review/${MOCK_COMIC_ID}`)
    );
    expect(generateAllHit).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Loading state
// ---------------------------------------------------------------------------

describe("Loading state", () => {
  it("disables the Approve button while PUT /approve is in-flight", async () => {
    let resolveApprove!: (value: Response) => void;
    server.use(
      http.put("/api/comic/:id/approve", () =>
        new Promise<Response>((res) => {
          resolveApprove = res;
        })
      )
    );

    const { user } = setup();
    await selectAutomatedMode(user);
    await user.click(screen.getByRole("button", { name: /approve & generate/i }));

    expect(
      screen.getByRole("button", { name: /approve & generate/i })
    ).toBeDisabled();

    resolveApprove(HttpResponse.json({ success: true }) as unknown as Response);
  });
});

// ---------------------------------------------------------------------------
// 6. Error — script generation failure
// ---------------------------------------------------------------------------

describe("Error — script generation failure", () => {
  it("shows an error card when POST /script/generate fails", async () => {
    server.use(
      http.post("/api/comic/:id/script/generate", () =>
        HttpResponse.json({ error: "AI service unavailable" }, { status: 503 })
      )
    );

    setup();
    expect(
      await screen.findByText(/couldn't generate your script/i)
    ).toBeInTheDocument();
  });

  it("shows a Go back link when script generation fails", async () => {
    server.use(
      http.post("/api/comic/:id/script/generate", () =>
        HttpResponse.json({ error: "AI service unavailable" }, { status: 503 })
      )
    );

    setup();
    const link = await screen.findByRole("link", { name: /go back/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("does not render the script or button on generation error", async () => {
    server.use(
      http.post("/api/comic/:id/script/generate", () =>
        HttpResponse.json({ error: "AI service unavailable" }, { status: 503 })
      )
    );

    setup();
    await screen.findByText(/couldn't generate your script/i);
    expect(
      screen.queryByRole("button", { name: /approve & generate/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/comic script/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Error — approve failure
// ---------------------------------------------------------------------------

describe("Error — approve failure", () => {
  it("shows an inline error when PUT /approve returns 500", async () => {
    server.use(
      http.put("/api/comic/:id/approve", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await selectAutomatedMode(user);
    await user.click(screen.getByRole("button", { name: /approve & generate/i }));

    expect(
      await screen.findByText(/failed to approve script/i)
    ).toBeInTheDocument();
  });

  it("re-enables the Approve button after an approve error", async () => {
    server.use(
      http.put("/api/comic/:id/approve", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await selectAutomatedMode(user);
    await user.click(screen.getByRole("button", { name: /approve & generate/i }));

    await screen.findByText(/failed to approve script/i);
    expect(
      screen.getByRole("button", { name: /approve & generate/i })
    ).not.toBeDisabled();
  });

  it("does not navigate after an approve error", async () => {
    server.use(
      http.put("/api/comic/:id/approve", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    const { user } = setup();
    await selectAutomatedMode(user);
    await user.click(screen.getByRole("button", { name: /approve & generate/i }));

    await screen.findByText(/failed to approve script/i);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. Edit mode
// ---------------------------------------------------------------------------

describe("Edit mode", () => {
  it("shows Done and Cancel buttons when Edit is clicked", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^edit$/i });
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(screen.getByRole("button", { name: /^done$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it("shows editable title input when in edit mode", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^edit$/i });
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(screen.getByRole("textbox", { name: /script title/i })).toBeInTheDocument();
  });

  it("updates title when edited and saved", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^edit$/i });
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    const titleInput = screen.getByRole("textbox", { name: /script title/i });
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    await user.click(screen.getByRole("button", { name: /^done$/i }));

    expect(screen.getByText("New Title")).toBeInTheDocument();
    expect(
      screen.queryByText("Inspector Whiskers and the Clockwork Diamond")
    ).not.toBeInTheDocument();
  });

  it("discards changes when Cancel is clicked", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^edit$/i });
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    const titleInput = screen.getByRole("textbox", { name: /script title/i });
    await user.clear(titleInput);
    await user.type(titleInput, "Discarded Title");

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      screen.getByText("Inspector Whiskers and the Clockwork Diamond")
    ).toBeInTheDocument();
    expect(screen.queryByText("Discarded Title")).not.toBeInTheDocument();
  });

  it("hides mode selection and Approve button while editing", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^edit$/i });
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(
      screen.queryByRole("radio", { name: /automated mode/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /approve/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 9. Regenerate flow
// ---------------------------------------------------------------------------

describe("Regenerate flow", () => {
  it("shows feedback textarea when Regenerate button is clicked", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^regenerate$/i });
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    expect(
      screen.getByRole("textbox", { name: /regeneration feedback/i })
    ).toBeInTheDocument();
  });

  it("hides feedback panel when Cancel is clicked", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^regenerate$/i });
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      screen.queryByRole("textbox", { name: /regeneration feedback/i })
    ).not.toBeInTheDocument();
  });

  it("calls POST /script/regenerate and updates the script", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^regenerate$/i });
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    const feedbackInput = screen.getByRole("textbox", { name: /regeneration feedback/i });
    await user.type(feedbackInput, "Make the villain more sympathetic");

    await user.click(screen.getByRole("button", { name: /regenerate script/i }));

    expect(
      await screen.findByText(/inspector whiskers and the clockwork diamond \(revised\)/i)
    ).toBeInTheDocument();
  });

  it("hides feedback panel after successful regeneration", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: /^regenerate$/i });
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await user.click(screen.getByRole("button", { name: /regenerate script/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /regeneration feedback/i })
      ).not.toBeInTheDocument()
    );
  });

  it("shows error message when regeneration fails", async () => {
    server.use(
      http.post("/api/comic/:id/script/regenerate", () =>
        HttpResponse.json({ error: "AI service unavailable" }, { status: 503 })
      )
    );

    const { user } = setup();
    await screen.findByRole("button", { name: /^regenerate$/i });
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await user.click(screen.getByRole("button", { name: /regenerate script/i }));

    expect(
      await screen.findByText(/failed to regenerate script/i)
    ).toBeInTheDocument();
  });
});
