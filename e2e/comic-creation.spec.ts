import { test, expect } from "@playwright/test";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const COMIC_ID = "e2e-test-comic-001";

const MOCK_SCRIPT = {
  title: "The Robot Painter",
  synopsis: "A robot discovers the beauty of art in a grey world.",
  pages: [
    {
      pageNumber: 1,
      panels: [
        {
          panelNumber: 1,
          description: "Wide shot of a grey factory floor.",
          dialogue: [{ speaker: "Robot", text: "Is this all there is?" }],
          caption: "Year 2087.",
        },
      ],
    },
    {
      pageNumber: 2,
      panels: [
        {
          panelNumber: 1,
          description: "Robot discovers an abandoned art studio.",
          dialogue: [],
          caption: "A new beginning.",
        },
      ],
    },
  ],
};

const MOCK_FOLLOW_UP_QUESTIONS = [
  { id: "q1", question: "What drives the robot to seek something more?" },
];

const MOCK_COMIC_INPUT = {
  id: COMIC_ID,
  userId: null,
  status: "input" as const,
  createdAt: "2026-04-19T00:00:00Z",
  updatedAt: "2026-04-19T00:00:00Z",
  prompt: "A robot learns to paint",
  artStyle: "manga" as const,
  pageCount: 2,
  followUpQuestions: MOCK_FOLLOW_UP_QUESTIONS,
  pages: [],
  currentPageIndex: 0,
};

const MOCK_COMIC_COMPLETE = {
  ...MOCK_COMIC_INPUT,
  status: "complete" as const,
  script: MOCK_SCRIPT,
  generationMode: "automated" as const,
  pages: [
    {
      pageNumber: 1,
      versions: [
        {
          imageUrl: "https://example.com/page-1.png",
          generatedAt: "2026-04-19T01:00:00Z",
        },
      ],
      selectedVersionIndex: 0,
    },
    {
      pageNumber: 2,
      versions: [
        {
          imageUrl: "https://example.com/page-2.png",
          generatedAt: "2026-04-19T01:00:00Z",
        },
      ],
      selectedVersionIndex: 0,
    },
  ],
  currentPageIndex: 2,
};

// ── Route setup ───────────────────────────────────────────────────────────────

test.describe("Comic creation flow", () => {
  test.beforeEach(async ({ page }) => {
    // Track GET /api/comic/:id call count:
    // - call 1: QA page mount → return input status with follow-up questions
    // - call 2+: polling + comic viewer mount → return complete status
    let getComicCallCount = 0;

    // Register specific sub-routes before the generic /:id route so they match first.

    await page.route("**/api/comic/random-idea", (route) =>
      route.fulfill({ json: { idea: "A robot learns to paint in a grey world" } })
    );

    await page.route(`**/api/comic/${COMIC_ID}/script/generate`, (route) =>
      route.fulfill({ json: { script: MOCK_SCRIPT } })
    );

    await page.route(`**/api/comic/${COMIC_ID}/refine`, (route) =>
      route.fulfill({ json: { success: true } })
    );

    await page.route(`**/api/comic/${COMIC_ID}/approve`, (route) =>
      route.fulfill({ json: { success: true } })
    );

    await page.route(`**/api/comic/${COMIC_ID}/generate-all`, (route) =>
      route.fulfill({ json: { comic: MOCK_COMIC_COMPLETE } })
    );

    // GET /api/comic/:id — call-count-based response
    await page.route(`**/api/comic/${COMIC_ID}`, (route) => {
      if (route.request().method() !== "GET") {
        route.continue();
        return;
      }
      getComicCallCount++;
      const comic = getComicCallCount === 1 ? MOCK_COMIC_INPUT : MOCK_COMIC_COMPLETE;
      route.fulfill({ json: { comic } });
    });

    // POST /api/comic — create comic
    await page.route("**/api/comic", (route) => {
      if (route.request().method() !== "POST") {
        route.continue();
        return;
      }
      route.fulfill({
        status: 201,
        json: {
          comicId: COMIC_ID,
          followUpQuestions: MOCK_FOLLOW_UP_QUESTIONS,
        },
      });
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("homepage → Q&A skip → script review → automated mode → comic viewer", async ({
    page,
  }) => {
    // ── Step 1: Landing page ─────────────────────────────────────────────────
    await page.goto("/");

    // Fill the prompt textarea (id="prompt" per LandingPage.tsx)
    await page.fill("#prompt", "A robot learns to paint in a grey world");

    // Default art style is "manga" — no change needed.
    // Default page count is 5 — no change needed.

    // Submit the form
    await page.getByRole("button", { name: "Create Comic" }).click();

    // ── Step 2: Q&A page ─────────────────────────────────────────────────────
    await page.waitForURL(`**/create?id=${COMIC_ID}`);

    // Wait for the question to load (QA page fetches comic on mount)
    await expect(
      page.getByText(MOCK_FOLLOW_UP_QUESTIONS[0].question)
    ).toBeVisible();

    // Skip all questions
    await page.getByRole("button", { name: "Skip All" }).click();

    // ── Step 3: Script review page ────────────────────────────────────────────
    await page.waitForURL(`**/script/${COMIC_ID}`);

    // Wait for script generation to complete (script title appears as <h1>)
    await expect(
      page.getByRole("heading", { name: MOCK_SCRIPT.title })
    ).toBeVisible({ timeout: 10_000 });

    // Select Automated mode (role="radio" aria-label="Automated mode" per ScriptReviewPage.tsx)
    await page.getByRole("radio", { name: "Automated mode" }).click();

    // Install fake clock NOW so the polling setInterval (created after approve)
    // uses the fake clock and can be triggered instantly with clock.tick().
    await page.clock.install();

    // Click Approve & Generate (button text changes to this when automated is selected)
    await page.getByRole("button", { name: "Approve & Generate" }).click();

    // Polling phase starts — progress banner should appear
    // (role="status" aria-label="Generation progress" per ScriptReviewPage.tsx)
    await expect(
      page.getByRole("status", { name: "Generation progress" })
    ).toBeVisible();

    // Advance the fake clock past the 5 000 ms polling interval to trigger the
    // first poll. The mock returns status:"complete", which navigates to viewer.
    // runFor fires all callbacks along the way (unlike fastForward which skips them).
    await page.clock.runFor(5_100);

    // ── Step 4: Comic viewer ──────────────────────────────────────────────────
    await page.waitForURL(`**/comic/${COMIC_ID}`, { timeout: 10_000 });

    // Title heading (comic?.script?.title per ComicViewerPage.tsx)
    await expect(
      page.getByRole("heading", { name: MOCK_SCRIPT.title })
    ).toBeVisible();

    // Comic pages rendered as <img alt="Page N">
    await expect(page.getByAltText("Page 1")).toBeVisible();
    await expect(page.getByAltText("Page 2")).toBeVisible();

    // Share button present for all viewers
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  });
});
