import type { Script, GenerationMode } from "@/backend/lib/types";
import { getComic, saveComic } from "@/backend/lib/db";
import { validateScript } from "@/backend/lib/ai/script-generator";

interface ApproveComicInput {
  script: Script;
  generationMode: GenerationMode;
}

interface ApproveComicResult {
  success: true;
}

const VALID_MODES: GenerationMode[] = ["supervised", "automated"];

function validate(body: unknown): ApproveComicInput {
  if (!body || typeof body !== "object") {
    throw new Error("INVALID_INPUT: Request body is required");
  }
  const { script, generationMode } = body as Record<string, unknown>;

  if (!script || typeof script !== "object") {
    throw new Error("INVALID_INPUT: script is required");
  }
  if (!generationMode || !VALID_MODES.includes(generationMode as GenerationMode)) {
    throw new Error("INVALID_INPUT: generationMode must be 'supervised' or 'automated'");
  }

  return {
    script: script as Script,
    generationMode: generationMode as GenerationMode,
  };
}

export async function approveComic(
  id: string,
  body: unknown
): Promise<ApproveComicResult> {
  const input = validate(body);

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
