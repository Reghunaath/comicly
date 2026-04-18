import type { ArtStylePreset, Script } from "@/backend/lib/types";
import { MIN_PANELS_PER_PAGE, MAX_PANELS_PER_PAGE } from "@/backend/lib/constants";
import { ai } from "./gemini-client";
import {
  buildFollowUpQuestionsPrompt,
  buildRandomIdeaPrompt,
  buildScriptPrompt,
  buildScriptRegenerationPrompt,
  buildJsonRetryPrompt,
} from "./prompts";
import type { FollowUpQuestion } from "@/backend/lib/types";

const TEXT_MODEL = "gemini-2.5-flash";

async function callGeminiText(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });
  return response.text ?? "";
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
}

async function parseJsonWithRetry<T>(
  firstResponse: string,
  retryPrompt: () => Promise<string>
): Promise<T> {
  try {
    return JSON.parse(stripCodeFences(firstResponse)) as T;
  } catch {
    const retried = await retryPrompt();
    return JSON.parse(stripCodeFences(retried)) as T;
  }
}

export function validateScript(script: Script, expectedPageCount: number): void {
  if (!script.title || typeof script.title !== "string") {
    throw new Error("Script missing title");
  }
  if (!Array.isArray(script.characters)) {
    throw new Error("Script missing characters array");
  }
  if (!Array.isArray(script.pages) || script.pages.length !== expectedPageCount) {
    throw new Error(
      `Script has ${script.pages?.length ?? 0} pages, expected ${expectedPageCount}`
    );
  }
  for (const page of script.pages) {
    const panelCount = page.panels?.length ?? 0;
    if (panelCount < MIN_PANELS_PER_PAGE || panelCount > MAX_PANELS_PER_PAGE) {
      throw new Error(
        `Page ${page.pageNumber} has ${panelCount} panels (must be ${MIN_PANELS_PER_PAGE}–${MAX_PANELS_PER_PAGE})`
      );
    }
  }
}

export async function generateFollowUpQuestions(
  prompt: string,
  artStyle: ArtStylePreset,
  pageCount: number
): Promise<FollowUpQuestion[]> {
  const aiPrompt = buildFollowUpQuestionsPrompt(prompt, artStyle, pageCount);
  const raw = await callGeminiText(aiPrompt);

  const questions = await parseJsonWithRetry<FollowUpQuestion[]>(raw, async () => {
    const retryRaw = await callGeminiText(buildJsonRetryPrompt());
    return retryRaw;
  });

  if (!Array.isArray(questions)) {
    throw new Error("Follow-up questions response is not an array");
  }

  return questions;
}

export async function generateRandomIdea(): Promise<string> {
  const prompt = buildRandomIdeaPrompt();
  return callGeminiText(prompt);
}

export async function generateScript(
  prompt: string,
  artStyle: ArtStylePreset,
  pageCount: number,
  followUpAnswers?: Record<string, string>
): Promise<Script> {
  const aiPrompt = buildScriptPrompt(prompt, artStyle, pageCount, followUpAnswers);
  const raw = await callGeminiText(aiPrompt);

  const script = await parseJsonWithRetry<Script>(raw, async () => {
    const retryRaw = await callGeminiText(buildJsonRetryPrompt());
    return retryRaw;
  });

  validateScript(script, pageCount);
  return script;
}

export async function regenerateScript(
  prompt: string,
  artStyle: ArtStylePreset,
  pageCount: number,
  followUpAnswers: Record<string, string> | undefined,
  currentScript: Script,
  feedback: string
): Promise<Script> {
  const aiPrompt = buildScriptRegenerationPrompt(
    prompt,
    artStyle,
    pageCount,
    followUpAnswers,
    currentScript,
    feedback
  );
  const raw = await callGeminiText(aiPrompt);

  const script = await parseJsonWithRetry<Script>(raw, async () => {
    const retryRaw = await callGeminiText(buildJsonRetryPrompt());
    return retryRaw;
  });

  validateScript(script, pageCount);
  return script;
}
