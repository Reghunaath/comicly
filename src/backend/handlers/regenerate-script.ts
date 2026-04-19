import type { Script } from "@/backend/lib/types";
import { getComic, saveComic } from "@/backend/lib/db";
import { regenerateScript as regenerateScriptAI } from "@/backend/lib/ai/script-generator";

const MAX_FEEDBACK_LENGTH = 2000;

interface RegenerateScriptResult {
  script: Script;
}

function validate(body: unknown): { feedback: string } {
  if (!body || typeof body !== "object") {
    throw new Error("INVALID_INPUT: Request body is required");
  }

  const { feedback } = body as Record<string, unknown>;

  if (!feedback || typeof feedback !== "string" || feedback.trim() === "") {
    throw new Error("INVALID_INPUT: feedback is required and must be a non-empty string");
  }

  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    throw new Error(`INVALID_INPUT: feedback must not exceed ${MAX_FEEDBACK_LENGTH} characters`);
  }

  return { feedback: feedback.trim() };
}

export async function regenerateComicScript(
  id: string,
  body: unknown
): Promise<RegenerateScriptResult> {
  const { feedback } = validate(body);

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
