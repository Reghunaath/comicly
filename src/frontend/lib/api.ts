/**
 * Frontend API client.
 *
 * Wraps all fetch calls to the backend. Set NEXT_PUBLIC_USE_MOCK_API=true in
 * .env.local to use mock responses while Reghu's backend is in progress.
 */

import type { ArtStylePreset, Comic, ComicSummary, GenerationMode, Script } from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface CreateComicResponse {
  comicId: string;
  followUpQuestions: Comic["followUpQuestions"];
}

export interface RandomIdeaResponse {
  idea: string;
}

// ---------------------------------------------------------------------------
// Landing page endpoints (#8)
// ---------------------------------------------------------------------------

export async function getRandomIdea(): Promise<RandomIdeaResponse> {
  if (USE_MOCK) {
    return mockGetRandomIdea();
  }
  const res = await fetch("/api/comic/random-idea");
  if (!res.ok) throw new Error("Failed to fetch random idea");
  return res.json();
}

export async function createComic(payload: {
  prompt: string;
  artStyle: ArtStylePreset;
  customStylePrompt?: string;
  pageCount: number;
}): Promise<CreateComicResponse> {
  if (USE_MOCK) {
    return mockCreateComic(payload);
  }
  const res = await fetch("/api/comic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error ?? "Failed to create comic");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Q&A page endpoint (#9)
// ---------------------------------------------------------------------------

export async function getComic(id: string): Promise<{ comic: Comic }> {
  if (USE_MOCK) return mockGetComic(id);
  const res = await fetch(`/api/comic/${id}`);
  if (res.status === 404) throw new Error("Comic not found");
  if (!res.ok) throw new Error("Failed to load comic");
  return res.json();
}

export async function refineComic(
  id: string,
  answers: Record<string, string>
): Promise<void> {
  if (USE_MOCK) {
    void answers;
    await delay(600);
    return;
  }
  const res = await fetch(`/api/comic/${id}/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error("Failed to submit answers");
}

// ---------------------------------------------------------------------------
// Script Review endpoints (#10)
// ---------------------------------------------------------------------------

export async function generateScript(id: string): Promise<{ script: Script }> {
  if (USE_MOCK) return mockGenerateScript(id);
  const res = await fetch(`/api/comic/${id}/script/generate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate script");
  return res.json();
}

function normalizeScript(script: Script): Script {
  return {
    ...script,
    pages: script.pages.map((page) => ({
      ...page,
      panels: page.panels.map((panel) => ({
        ...panel,
        caption: panel.caption ?? undefined,
      })),
    })),
  };
}

export async function approveScript(
  id: string,
  generationMode: GenerationMode,
  script: Script
): Promise<void> {
  if (USE_MOCK) {
    void generationMode;
    void script;
    await delay(400);
    return;
  }
  const res = await fetch(`/api/comic/${id}/approve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationMode, script: normalizeScript(script) }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("approve error body:", errBody);
    throw new Error(errBody.error ?? "Failed to approve script");
  }
}

export async function regenerateScript(
  id: string,
  feedback: string
): Promise<{ script: Script }> {
  if (USE_MOCK) return mockRegenerateScript(feedback);
  const res = await fetch(`/api/comic/${id}/script/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error("Failed to regenerate script");
  return res.json();
}

export async function generateAllPages(id: string): Promise<void> {
  if (USE_MOCK) return mockGenerateAllPages(id);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`/api/comic/${id}/generate-all`, {
      method: "POST",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("Failed to start generation");
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") return;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Library endpoints (#21)
// ---------------------------------------------------------------------------

export interface LibraryResponse {
  comics: ComicSummary[];
}

export async function getLibraryComics(): Promise<LibraryResponse> {
  if (USE_MOCK) return mockGetLibraryComics();
  const res = await fetch("/api/library");
  if (res.status === 401) throw new Error("Authentication required");
  if (!res.ok) throw new Error("Failed to load library");
  return res.json();
}

export async function deleteComic(id: string): Promise<void> {
  if (USE_MOCK) {
    await delay(400);
    return;
  }
  const res = await fetch(`/api/comic/${id}`, { method: "DELETE" });
  if (res.status === 401) throw new Error("Authentication required");
  if (res.status === 403) throw new Error("You do not own this comic");
  if (!res.ok) throw new Error("Failed to delete comic");
}

export async function claimComic(id: string): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    await delay(300);
    return { success: true };
  }
  const res = await fetch(`/api/comic/${id}/claim`, { method: "PUT" });
  if (res.status === 401) throw new Error("Authentication required");
  if (res.status === 403) throw new Error("Comic already owned by another user");
  if (!res.ok) throw new Error("Failed to claim comic");
  return res.json();
}

// ---------------------------------------------------------------------------
// Supervised Mode endpoints (#20)
// ---------------------------------------------------------------------------

export async function generatePage(
  id: string,
  pageNumber: number
): Promise<{ page: import("./types").Page }> {
  if (USE_MOCK) return mockGeneratePage(id, pageNumber);
  const res = await fetch(`/api/comic/${id}/page/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageNumber }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error ?? "Failed to generate page");
  }
  return res.json();
}

export async function regeneratePage(
  id: string,
  pageNumber: number,
  feedback?: string
): Promise<{ page: import("./types").Page }> {
  if (USE_MOCK) return mockRegeneratePage(id, pageNumber);
  const res = await fetch(`/api/comic/${id}/page/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageNumber, ...(feedback ? { feedback } : {}) }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error ?? "Failed to regenerate page");
  }
  return res.json();
}

export async function selectPageVersion(
  id: string,
  pageNumber: number,
  versionIndex: number
): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  const res = await fetch(`/api/comic/${id}/page/select`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageNumber, versionIndex }),
  });
  if (!res.ok) throw new Error("Failed to select page version");
}

// ---------------------------------------------------------------------------
// Mock implementations (dev-only)
// ---------------------------------------------------------------------------

// Tracks which comic IDs have completed mock generation (for polling)
const _mockCompletedComics = new Set<string>();

async function mockGetLibraryComics(): Promise<LibraryResponse> {
  await delay(600);
  return {
    comics: [
      {
        id: "mock-lib-1",
        status: "complete",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        title: "Inspector Whiskers and the Clockwork Diamond",
        artStyle: "manga",
        pageCount: 5,
        thumbnailUrl: "https://picsum.photos/seed/mock-lib-1/400/600",
      },
      {
        id: "mock-lib-2",
        status: "generating",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        title: "The Last Bakery on Mars",
        artStyle: "watercolor_storybook",
        pageCount: 8,
        thumbnailUrl: null,
      },
      {
        id: "mock-lib-3",
        status: "script_draft",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        title: "Rival Chefs at the End of the World",
        artStyle: "western_comic",
        pageCount: 6,
        thumbnailUrl: null,
      },
      {
        id: "mock-lib-4",
        status: "input",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        title: null,
        artStyle: "minimalist_flat",
        pageCount: 4,
        thumbnailUrl: null,
      },
    ],
  };
}

async function mockGetRandomIdea(): Promise<RandomIdeaResponse> {
  await delay(400);
  const ideas = [
    "A retired astronaut opens a bakery on Mars, but the sourdough starter has developed sentience.",
    "A detective cat solves mysteries in a steampunk city where every clockwork gadget has a secret.",
    "Two rival chefs compete to cook the last meal before a comet hits Earth.",
    "A librarian discovers the books in the archive are writing themselves — about real people.",
    "A dragon who's terrified of fire tries to survive a winter in the Arctic.",
  ];
  return { idea: ideas[Math.floor(Math.random() * ideas.length)] };
}

async function mockCreateComic(payload: {
  prompt: string;
  artStyle: ArtStylePreset;
  pageCount: number;
}): Promise<CreateComicResponse> {
  await delay(800);
  void payload;
  return {
    comicId: `mock-${Date.now()}`,
    followUpQuestions: [
      { id: "q1", question: "Who is the main character and what drives them?" },
      { id: "q2", question: "What is the central conflict or challenge?" },
      { id: "q3", question: "What tone should the story have — lighthearted or serious?" },
    ],
  };
}

async function mockGetComic(id: string): Promise<{ comic: Comic }> {
  await delay(500);
  const isAutoComplete = _mockCompletedComics.has(id);
  const pageCount = 5;

  const supervisedPages = Array.from({ length: pageCount }, (_, i) => {
    const versions = _mockPageVersions.get(`${id}-p${i + 1}`);
    return versions ?? null;
  });
  const supervisedPageCount = supervisedPages.filter(Boolean).length;
  const isComplete = isAutoComplete || supervisedPageCount === pageCount;

  let pages: Comic["pages"] = [];
  if (isAutoComplete) {
    pages = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      versions: [
        {
          imageUrl: `https://picsum.photos/seed/${id}-p${i + 1}/800/1200`,
          generatedAt: new Date().toISOString(),
        },
      ],
      selectedVersionIndex: 0,
    }));
  } else if (supervisedPageCount > 0) {
    pages = supervisedPages
      .map((versions, i) =>
        versions ? { pageNumber: i + 1, versions, selectedVersionIndex: versions.length - 1 } : null
      )
      .filter((p): p is Comic["pages"][number] => p !== null);
  }

  return {
    comic: {
      id,
      userId: null,
      status: isComplete ? "complete" : "generating",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prompt: "A detective cat solves mysteries in a steampunk city",
      artStyle: "manga",
      pageCount,
      followUpQuestions: [
        { id: "q1", question: "Who is the main character and what drives them?" },
        { id: "q2", question: "What is the central conflict or challenge?" },
        { id: "q3", question: "What tone should the story have — lighthearted or serious?" },
      ],
      pages,
      currentPageIndex: supervisedPageCount > 0 ? supervisedPageCount : (isComplete ? pageCount : 0),
    },
  };
}

async function mockGenerateScript(id: string): Promise<{ script: Script }> {
  void id;
  await delay(1500);
  return {
    script: {
      title: "Inspector Whiskers and the Clockwork Diamond",
      synopsis:
        "A detective cat in a steampunk city must recover a stolen diamond before the city's clock tower stops forever.",
      characters: [
        {
          name: "Inspector Whiskers",
          appearance: "A tabby cat with sharp green eyes and a distinguished air",
          clothing: "Long detective coat, monocle, and a wide-brimmed hat",
          personality: "Meticulous, dry-witted, and fiercely determined",
        },
      ],
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              description:
                "Wide establishing shot of a foggy steampunk city at night — gears, pipes, and gas lamps everywhere.",
              dialogue: [{ speaker: "Narrator", text: "The city of Cogsworth never sleeps." }],
              caption: "A city of wonders... and secrets.",
            },
            {
              panelNumber: 2,
              description:
                "Close-up of Inspector Whiskers, a tabby cat in a long coat and monocle, studying a telegram.",
              dialogue: [
                { speaker: "Inspector Whiskers", text: "A stolen diamond, you say?" },
                { speaker: "Client", text: "The Clockwork Diamond — if it's not returned by dawn, the tower stops." },
              ],
            },
          ],
        },
        {
          pageNumber: 2,
          panels: [
            {
              panelNumber: 1,
              description: "Inspector Whiskers leaps across rooftops, silhouetted against a full moon.",
              dialogue: [],
              caption: "No time to lose.",
            },
            {
              panelNumber: 2,
              description:
                "Interior of a clockwork vault — gears spinning, the diamond glowing in a case.",
              dialogue: [{ speaker: "Inspector Whiskers", text: "There you are." }],
            },
          ],
        },
      ],
    },
  };
}

async function mockGenerateAllPages(id: string): Promise<void> {
  await delay(1000);
  _mockCompletedComics.add(id);
}

// Tracks mock page versions: key = `${id}-p${pageNumber}`
const _mockPageVersions = new Map<string, import("./types").PageVersion[]>();

async function mockGeneratePage(
  id: string,
  pageNumber: number
): Promise<{ page: import("./types").Page }> {
  await delay(1200);
  const key = `${id}-p${pageNumber}`;
  const versions: import("./types").PageVersion[] = [
    {
      imageUrl: `https://picsum.photos/seed/${key}-v0/800/1200`,
      generatedAt: new Date().toISOString(),
    },
  ];
  _mockPageVersions.set(key, versions);
  return { page: { pageNumber, versions, selectedVersionIndex: 0 } };
}

async function mockRegeneratePage(
  id: string,
  pageNumber: number
): Promise<{ page: import("./types").Page }> {
  await delay(1200);
  const key = `${id}-p${pageNumber}`;
  const existing = _mockPageVersions.get(key) ?? [];
  if (existing.length >= 4) {
    throw new Error("Maximum regeneration limit (3) reached for this page.");
  }
  const next = existing.length;
  const newVersion: import("./types").PageVersion = {
    imageUrl: `https://picsum.photos/seed/${key}-v${next}/800/1200`,
    generatedAt: new Date().toISOString(),
  };
  const versions = [...existing, newVersion];
  _mockPageVersions.set(key, versions);
  return { page: { pageNumber, versions, selectedVersionIndex: versions.length - 1 } };
}

async function mockRegenerateScript(feedback: string): Promise<{ script: Script }> {
  void feedback;
  await delay(1200);
  const { script } = await mockGenerateScript("mock");
  return {
    script: {
      ...script,
      title: script.title + " (Revised)",
      synopsis: "[Revised] " + script.synopsis,
    },
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
