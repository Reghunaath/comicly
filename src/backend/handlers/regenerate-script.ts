import type { Script } from "@/backend/lib/types";
import { getComic, saveComic } from "@/backend/lib/db";
import { regenerateScript as regenerateScriptAI } from "@/backend/lib/ai/script-generator";
import { parseOrThrow, RegenerateScriptSchema } from "@/backend/lib/validation";

interface RegenerateScriptResult {
  script: Script;
}

export async function regenerateComicScript(
  id: string,
  body: unknown
): Promise<RegenerateScriptResult> {
  const parsed = parseOrThrow(RegenerateScriptSchema, body);
  const feedback = parsed.feedback.trim();

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.status !== "script_draft") {
    throw new Error("STATUS_ERROR: Comic is not in script_draft status");
  }
  if (!comic.script) {
    throw new Error("STATUS_ERROR: Comic has no existing script to regenerate");
  }

  const script = await regenerateScriptAI(
    comic.prompt,
    comic.artStyle,
    comic.pageCount,
    comic.followUpAnswers,
    comic.script,
    feedback
  );

  await saveComic({ id, script });

  return { script };
}
