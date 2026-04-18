import type { Script } from "@/backend/lib/types";
import { getComic, saveComic } from "@/backend/lib/db";
import { generateScript } from "@/backend/lib/ai/script-generator";

interface GenerateScriptResult {
  script: Script;
}

export async function generateComicScript(id: string): Promise<GenerateScriptResult> {
  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.status !== "script_pending") {
    throw new Error("STATUS_ERROR: Comic is not ready for script generation");
  }

  const script = await generateScript(
    comic.prompt,
    comic.artStyle,
    comic.pageCount,
    comic.followUpAnswers
  );

  await saveComic({ id, script, status: "script_draft" });

  return { script };
}
