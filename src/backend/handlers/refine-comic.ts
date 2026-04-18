import { getComic, saveComic } from "@/backend/lib/db";

interface RefineComicInput {
  answers: Record<string, string>;
}

interface RefineComicResult {
  success: true;
}

function validate(body: unknown): RefineComicInput {
  if (!body || typeof body !== "object") {
    throw new Error("INVALID_INPUT: Request body is required");
  }
  const { answers } = body as Record<string, unknown>;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error("INVALID_INPUT: answers must be an object");
  }
  for (const [key, val] of Object.entries(answers)) {
    if (typeof val !== "string") {
      throw new Error(`INVALID_INPUT: answer for ${key} must be a string`);
    }
  }
  return { answers: answers as Record<string, string> };
}

export async function refineComic(
  id: string,
  body: unknown
): Promise<RefineComicResult> {
  const input = validate(body);

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
