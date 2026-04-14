/**
 * Frontend API client.
 *
 * Wraps all fetch calls to the backend. Set NEXT_PUBLIC_USE_MOCK_API=true in
 * .env.local to use mock responses while Reghu's backend is in progress.
 */

import type { ArtStylePreset, Comic, FollowUpQuestion } from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface CreateComicResponse {
  comicId: string;
  followUpQuestions: FollowUpQuestion[];
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
  const res = await fetch(`/api/comic/${id}`);
  if (res.status === 404) throw new Error("Comic not found");
  if (!res.ok) throw new Error("Failed to load comic");
  return res.json();
}

export async function refineComic(
  id: string,
  answers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/comic/${id}/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error("Failed to submit answers");
}

// ---------------------------------------------------------------------------
// Mock implementations (dev-only)
// ---------------------------------------------------------------------------

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
