import { getComic, saveComic } from "@/backend/lib/db";
import { parseOrThrow, RefineComicSchema } from "@/backend/lib/validation";

interface RefineComicResult {
  success: true;
}

export async function refineComic(
  id: string,
  body: unknown
): Promise<RefineComicResult> {
  const input = parseOrThrow(RefineComicSchema, body);

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.status !== "input") {
    throw new Error("STATUS_ERROR: Comic is not awaiting follow-up answers");
  }

  await saveComic({
    id,
    followUpAnswers: input.answers,
    status: "script_pending",
  });

  return { success: true };
}
