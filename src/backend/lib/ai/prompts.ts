import type { ArtStylePreset, Character, Script, ScriptPage } from "@/backend/lib/types";
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
- Each panel MUST include a "description" field following this structure: [Subject & Action] + [Spatial Placement] + [Camera Angle] + [Lighting] + [Key Details]. Write full descriptive sentences, not comma-separated keyword tags. Example: "A teenage girl leaps across a rain-soaked rooftop in the foreground, city skyline behind her at dusk. Low-angle shot looking up, warm golden backlight silhouetting her figure. Wind blows her short black hair, motion lines trail behind her."
- Each panel description MUST include spatial placement terms (e.g., "in the foreground", "centered", "upper-left third of the frame") and a camera angle (e.g., "close-up", "wide establishing shot", "low-angle worm's-eye view", "bird's-eye view").
- Dialogue should be natural and fit the genre.
- Captions are optional narrator text.
- The story must have a clear beginning, middle, and end.
- Include a "characters" array listing every named character in the story. Each character MUST have a HIGHLY DETAILED, exhaustive visual description covering: exact age, ethnicity, skin color/tone, height, body build, face shape, hair color/style/length, eye color/shape, nose shape, lip shape, any scars/freckles/birthmarks/tattoos, and any other distinguishing features. Write at least 3-4 sentences per character for the appearance field. These descriptions will be used as the sole reference for image generation — if a detail is omitted, the AI will guess inconsistently.
- Respond with ONLY valid JSON matching this exact structure, no other text:

{
  "title": "string",
  "synopsis": "string (2-3 sentences)",
  "characters": [
    {
      "name": "Character Name",
      "appearance": "Exact age, ethnicity, skin color/tone, height, body build, face shape, hair color/style/length, eye color/shape, nose shape, lip shape, scars/freckles/birthmarks/tattoos, and any other distinguishing features. At least 3-4 sentences.",
      "clothing": "Default outfit: specific garments, colors, accessories",
      "personality": "2-3 key personality traits that affect expressions and body language"
    }
  ],
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "description": "Detailed visual description using [Subject & Action] + [Spatial Placement] + [Camera Angle] + [Lighting] + [Key Details]...",
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

export function buildCharacterSheetPrompt(
  script: Script,
  artStyle: ArtStylePreset,
  customStylePrompt?: string
): string {
  const artStyleDescription = getArtStyleDescription(artStyle, customStylePrompt);

  const characterBlock = script.characters.length > 0
    ? script.characters
        .map((char, i) => {
          const lines = [
            `Appearance: ${char.appearance}`,
            char.clothing ? `Clothing: ${char.clothing}` : null,
            char.personality ? `Personality (inform expressions): ${char.personality}` : null,
          ]
            .filter(Boolean)
            .join("\n   ");
          return `${i + 1}. ${char.name}\n   ${lines}\n   Show: front view, 3/4 view, and side view at full-body scale. Below each angle, show 3 facial expressions (neutral, happy, angry). Label clearly.`;
        })
        .join("\n")
    : "No named characters — draw a generic placeholder character in the comic's art style.";

  return `Generate a character reference sheet in ${artStyleDescription} style.

This sheet will be used as a visual reference for generating comic book pages. Draw each character clearly on a clean background.

Characters to include:
${characterBlock}

Important:
- Clean white or neutral background.
- Show each character at full body scale with consistent proportions.
- Clean lineart with high detail and sharp outlines.
- Make character designs distinct and memorable.
- Style must be: ${artStyleDescription}
- This is a reference sheet, not a comic page — no panels, no speech bubbles, no story.`;
}

function getLayoutHint(panelCount: number): string {
  switch (panelCount) {
    case 2: return "Two equal panels stacked vertically.";
    case 3: return "Two panels across the top row, one wide cinematic panel spanning the bottom.";
    case 4: return "2×2 grid with equal panel sizes.";
    case 5: return "Two panels top row, one wide panel in the middle, two panels bottom row.";
    case 6: return "3×2 grid arrangement with equal panel sizes.";
    default: return `${panelCount} panels arranged in a balanced comic book layout.`;
  }
}

function getPacingNote(pageNumber: number, totalPages: number): string {
  if (totalPages === 1) {
    return "Single-page story — establish setting, deliver the arc, and conclude with impact.";
  }
  if (pageNumber === 1) {
    return "Opening page — establish the setting, introduce characters, and set the tone.";
  }
  if (pageNumber === totalPages) {
    return "Final page — deliver resolution, emotional payoff, and a satisfying conclusion.";
  }
  return "Mid-story page — build tension, advance the plot, and maintain momentum.";
}

export function buildPageImagePrompt(
  scriptPage: ScriptPage,
  artStyle: ArtStylePreset,
  title: string,
  totalPages: number,
  customStylePrompt?: string,
  hasCharacterSheet?: boolean,
  hasPreviousPage?: boolean,
  characters?: Character[]
): string {
  const artStyleDescription = getArtStyleDescription(artStyle, customStylePrompt);
  const panelCount = scriptPage.panels.length;

  const panelDescriptions = scriptPage.panels
    .map((panel) => {
      const dialogueLines =
        panel.dialogue.length > 0
          ? panel.dialogue
              .map((d) => `  Dialogue — ${d.speaker}: "${d.text}"`)
              .join("\n")
          : "  No dialogue.";
      const caption = panel.caption ? `\n  Caption: "${panel.caption}"` : "";
      return `Panel ${panel.panelNumber}:
  Subject & Action: ${panel.description}
${dialogueLines}${caption}
  Style continuity: ${artStyleDescription}`;
    })
    .join("\n\n");

  const refInstructions: string[] = [];
  if (hasCharacterSheet) {
    refInstructions.push(
      "The FIRST attached reference image is a CHARACTER REFERENCE SHEET. You MUST use it to keep every character's design (face, body, outfit, colors, proportions) exactly consistent. Do NOT deviate from the character designs shown in the sheet."
    );
  }
  if (hasPreviousPage) {
    refInstructions.push(
      `The ${hasCharacterSheet ? "SECOND" : "FIRST"} attached reference image is the PREVIOUS comic page. Match the art style, color palette, character appearances, and visual tone from that page to ensure visual continuity across the comic.`
    );
  }
  const refBlock =
    refInstructions.length > 0
      ? `\nREFERENCE IMAGES:\n${refInstructions.join("\n")}\n`
      : "";

  let characterBlock = "";
  if (characters && characters.length > 0) {
    characterBlock = `\nCHARACTER APPEARANCE REFERENCE (maintain these designs exactly):\n${characters
      .map((c) => {
        const parts = [`- ${c.name}: ${c.appearance}`];
        if (c.clothing) parts.push(`  Outfit: ${c.clothing}`);
        return parts.join("\n");
      })
      .join("\n")}\n`;
  }

  return `WORK SURFACE:
A single comic book page, ${panelCount} panels, portrait orientation, ${IMAGE_ASPECT_RATIO} aspect ratio, 1K resolution.
This is page ${scriptPage.pageNumber} of ${totalPages} in a comic called "${title}".

LAYOUT:
${getLayoutHint(panelCount)} Use clear panel borders with uniform gutters between panels.
${refBlock}${characterBlock}
COMPONENTS:
• ${panelCount} comic panels with clearly defined black borders
• Speech bubbles with dialogue text, placed in the upper region of panels, never overlapping character faces
• Caption boxes for narrator text where specified
• Consistent character designs across all panels

STYLE:
${artStyleDescription}

SOURCE MATERIAL:
${panelDescriptions}

CONSTRAINTS:
• No overlap between speech bubbles and character faces
• Text inside speech bubbles must be sharp and readable at small sizes
• Character design must remain IDENTICAL across all panels and with any provided reference images
• Character design must NOT deviate from the character sheet and the previous page attached for reference, if provided.
• Uniform spacing between panel borders
• Consistent shadow direction and lighting across all panels
• Consistent color palette throughout the page

INTERPRETATION:
This is page ${scriptPage.pageNumber} of ${totalPages}. ${getPacingNote(scriptPage.pageNumber, totalPages)}`;
}

export function buildJsonRetryPrompt(): string {
  return "Your previous response was not valid JSON. Please try again with ONLY valid JSON, no markdown fences or extra text.";
}
