import type { ArtStylePreset, FollowUpQuestion } from "@/backend/lib/types";
import { MIN_PAGES, MAX_PAGES } from "@/backend/lib/constants";
import { getOptionalUser } from "@/backend/lib/supabase/middleware";
import { generateFollowUpQuestions } from "@/backend/lib/ai/script-generator";
import { saveComic } from "@/backend/lib/db";

const VALID_ART_STYLES: ArtStylePreset[] = [
  "manga",
  "western_comic",
  "watercolor_storybook",
  "minimalist_flat",
  "vintage_newspaper",
  "custom",
];

interface CreateComicInput {
  prompt: string;
  artStyle: ArtStylePreset;
  customStylePrompt?: string | null;
  pageCount: number;
}

interface CreateComicResult {
  comicId: string;
  followUpQuestions: FollowUpQuestion[];
}

function validate(body: unknown): CreateComicInput {
  if (!body || typeof body !== "object") {
    throw new Error("INVALID_INPUT: Request body is required");
  }

  const { prompt, artStyle, customStylePrompt, pageCount } = body as Record<string, unknown>;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("INVALID_INPUT: prompt is required and must be a non-empty string");
  }

  if (!artStyle || !VALID_ART_STYLES.includes(artStyle as ArtStylePreset)) {
    throw new Error(
      `INVALID_INPUT: artStyle must be one of: ${VALID_ART_STYLES.join(", ")}`
    );
  }

  if (artStyle === "custom" && (!customStylePrompt || typeof customStylePrompt !== "string" || customStylePrompt.trim() === "")) {
    throw new Error("INVALID_INPUT: customStylePrompt is required when artStyle is 'custom'");
  }

  if (
    typeof pageCount !== "number" ||
    !Number.isInteger(pageCount) ||
    pageCount < MIN_PAGES ||
    pageCount > MAX_PAGES
  ) {
    throw new Error(
      `INVALID_INPUT: pageCount must be an integer between ${MIN_PAGES} and ${MAX_PAGES}`
    );
  }

  return {
    prompt: prompt.trim(),
    artStyle: artStyle as ArtStylePreset,
    customStylePrompt: typeof customStylePrompt === "string" ? customStylePrompt : undefined,
    pageCount,
  };
}

export async function createComic(body: unknown): Promise<CreateComicResult> {
  const input = validate(body);

  const user = await getOptionalUser();

  const followUpQuestions = await generateFollowUpQuestions(
    input.prompt,
    input.artStyle,
    input.pageCount
  );

  const comicId = crypto.randomUUID();

  await saveComic({
    id: comicId,
    userId: user?.id ?? null,
    status: "input",
    prompt: input.prompt,
    artStyle: input.artStyle,
    customStylePrompt: input.customStylePrompt ?? undefined,
    pageCount: input.pageCount,
    followUpQuestions,
    currentPageIndex: 0,
    pages: [],
  });

  return { comicId, followUpQuestions };
}
