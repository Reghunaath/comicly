import type { FollowUpQuestion } from "@/backend/lib/types";
import { getOptionalUser } from "@/backend/lib/supabase/middleware";
import { generateFollowUpQuestions } from "@/backend/lib/ai/script-generator";
import { insertComic } from "@/backend/lib/db";
import { parseOrThrow, CreateComicSchema } from "@/backend/lib/validation";

interface CreateComicResult {
  comicId: string;
  followUpQuestions: FollowUpQuestion[];
}

export async function createComic(body: unknown): Promise<CreateComicResult> {
  const input = parseOrThrow(CreateComicSchema, body);

  const user = await getOptionalUser();

  const followUpQuestions = await generateFollowUpQuestions(
    input.prompt,
    input.artStyle,
    input.pageCount
  );

  const comicId = crypto.randomUUID();

  await insertComic({
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
