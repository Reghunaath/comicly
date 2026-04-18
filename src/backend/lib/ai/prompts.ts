import type { ArtStylePreset, Script, ScriptPage } from "@/backend/lib/types";
import { ART_STYLE_PRESETS, IMAGE_ASPECT_RATIO } from "@/backend/lib/constants";

function getArtStyleDescription(artStyle: ArtStylePreset, customStylePrompt?: string): string {
  if (artStyle === "custom") {
    return customStylePrompt ?? "custom style";
  }
  return ART_STYLE_PRESETS[artStyle].promptFragment;
}

export function buildFollowUpQuestionsPrompt(
  prompt: string,
  artStyle: ArtStylePreset,
  pageCount: number
): string {
  return `You are a creative comic book editor. Given a user's comic idea, generate up to 5 short follow-up questions that would help personalize the story. Focus on character details, setting specifics, tone, and plot preferences. Do NOT ask about art style or length — those are already decided.

Respond with ONLY a JSON array of objects with "id" and "question" fields. No other text.

Example:
[
  {"id": "q1", "question": "What's the main character's personality like?"},
  {"id": "q2", "question": "Should the ending be happy, bittersweet, or a cliffhanger?"}
]

User's idea: "${prompt}"
Art style: "${artStyle}"
Number of pages: ${pageCount}`;
}

export function buildRandomIdeaPrompt(): string {
  return `Generate a single creative, fun, and specific comic book premise in one to two sentences. Be imaginative and varied — mix genres, settings, and characters. Do not repeat common tropes. Return ONLY the premise text, nothing else.`;
}

function formatFollowUpAnswers(answers?: Record<string, string>): string {
  if (!answers || Object.keys(answers).length === 0) {
    return "No additional details provided.";
  }
  return Object.entries(answers)
    .map(([id, answer]) => `${id}: ${answer}`)
    .join("\n");
}

const SCRIPT_SYSTEM_PROMPT = `You are a professional comic book writer. Write a complete comic script based on the user's input.

Rules:
- The script MUST have exactly {pageCount} pages.
- Each page MUST have between 2 and 6 panels.
- Each panel MUST include a "description" field with a detailed visual description suitable for an AI image generator. Include character appearances, poses, expressions, camera angles, lighting, and background details.
- Dialogue should be natural and fit the genre.
- Captions are optional narrator text.
- The story must have a clear beginning, middle, and end.
- Respond with ONLY valid JSON matching this exact structure, no other text:

{
  "title": "string",
  "synopsis": "string (2-3 sentences)",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "description": "Detailed visual description...",
          "dialogue": [{"speaker": "Name", "text": "What they say"}],
          "caption": "Optional narrator text or null"
        }
      ]
    }
  ]
}`;

export function buildScriptPrompt(
  prompt: string,
  artStyle: ArtStylePreset,
  pageCount: number,
  followUpAnswers?: Record<string, string>
): string {
  return `${SCRIPT_SYSTEM_PROMPT.replace("{pageCount}", String(pageCount))}

User's idea: "${prompt}"
Art style: "${artStyle}"
Number of pages: ${pageCount}
Additional details from the user:
${formatFollowUpAnswers(followUpAnswers)}`;
}

export function buildScriptRegenerationPrompt(
  prompt: string,
  artStyle: ArtStylePreset,
  pageCount: number,
  followUpAnswers: Record<string, string> | undefined,
  currentScript: Script,
  feedback: string
): string {
  return `${SCRIPT_SYSTEM_PROMPT.replace("{pageCount}", String(pageCount))}

User's idea: "${prompt}"
Art style: "${artStyle}"
Number of pages: ${pageCount}
Additional details from the user:
${formatFollowUpAnswers(followUpAnswers)}

Here is the current script that the user wants revised:
${JSON.stringify(currentScript, null, 2)}

The user's feedback on what to change:
"${feedback}"

Rewrite the script incorporating this feedback while keeping the same structure requirements.`;
}

export function buildImagePrompt(
  page: ScriptPage,
  artStyle: ArtStylePreset,
  title: string,
  totalPages: number,
  customStylePrompt?: string
): string {
  const artStyleDescription = getArtStyleDescription(artStyle, customStylePrompt);

  const panelDescriptions = page.panels
    .map((panel) => {
      const dialogueLines = panel.dialogue
        .map((d) => `${d.speaker}: "${d.text}"`)
        .join("\n  ");
      const captionLine = panel.caption ? `\n  Caption: ${panel.caption}` : "";
      return `Panel ${panel.panelNumber}:
  Scene: ${panel.description}
  Dialogue:\n  ${dialogueLines || "(none)"}${captionLine}`;
    })
    .join("\n\n");

  return `Create a single comic book page illustration in ${artStyleDescription} style.

This is page ${page.pageNumber} of ${totalPages} in a comic called "${title}".

The page has ${page.panels.length} panels arranged in a comic book layout:

${panelDescriptions}

Important instructions:
- Render this as a SINGLE comic book page with clearly defined panel borders.
- Include speech bubbles with the dialogue text inside each panel.
- Include caption boxes for narrator text where specified.
- Maintain consistent character appearances across all panels.
- The overall style must be: ${artStyleDescription}
- Use a ${IMAGE_ASPECT_RATIO} aspect ratio.`;
}

export function buildJsonRetryPrompt(): string {
  return "Your previous response was not valid JSON. Please try again with ONLY valid JSON, no markdown fences or extra text.";
}
