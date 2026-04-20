import type { Script } from "@/backend/lib/types";
import { getComic, saveComic } from "@/backend/lib/db";
import { validateScript } from "@/backend/lib/ai/script-generator";
import { parseOrThrow, ApproveComicSchema } from "@/backend/lib/validation";

interface ApproveComicResult {
  success: true;
}

export async function approveComic(
  id: string,
  body: unknown
): Promise<ApproveComicResult> {
  const raw = parseOrThrow(ApproveComicSchema, body);
  const input = { script: raw.script as unknown as Script, generationMode: raw.generationMode };

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.status !== "script_draft") {
    throw new Error("STATUS_ERROR: Comic script is not in draft state");
  }

  validateScript(input.script, comic.pageCount);

  await saveComic({
    id,
    script: input.script,
    generationMode: input.generationMode,
    status: "script_approved",
  });

  return { success: true };
}
