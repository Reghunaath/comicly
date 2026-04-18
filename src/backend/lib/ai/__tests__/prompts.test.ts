import { describe, it, expect } from "vitest";
import {
  buildFollowUpQuestionsPrompt,
  buildRandomIdeaPrompt,
  buildScriptPrompt,
  buildScriptRegenerationPrompt,
  buildPageImagePrompt,
  buildCharacterSheetPrompt,
  buildJsonRetryPrompt,
} from "../prompts";
import type { Character, Script, ScriptPage } from "@/backend/lib/types";

const mockCharacter: Character = {
  name: "Detective Mira",
  appearance: "A woman in her mid-30s of South Asian descent with warm brown skin and a lean athletic build. She has high cheekbones, sharp almond-shaped dark brown eyes, and a straight nose. Her black hair is cut in a short blunt bob that falls to her jaw.",
  clothing: "A charcoal grey trench coat over a white button-down shirt, dark slim trousers, and worn leather Oxford shoes.",
  personality: "Methodical, quietly intense, dry sense of humour.",
};

const mockScript: Script = {
  title: "Test Comic",
  synopsis: "A test synopsis.",
  characters: [mockCharacter],
  pages: [
    {
      pageNumber: 1,
      panels: [
        {
          panelNumber: 1,
          description: "A hero stands on a rooftop.",
          dialogue: [{ speaker: "Hero", text: "Let's go!" }],
        },
      ],
    },
  ],
};

const mockPage: ScriptPage = {
  pageNumber: 1,
  panels: [
    {
      panelNumber: 1,
      description: "A detective examines a clue.",
      dialogue: [{ speaker: "Detective", text: "Interesting..." }],
      caption: "The mystery deepens.",
    },
    {
      panelNumber: 2,
      description: "A wide shot of the city at night.",
      dialogue: [],
    },
  ],
};

describe("buildFollowUpQuestionsPrompt", () => {
  it("includes the user prompt", () => {
    const result = buildFollowUpQuestionsPrompt("A space adventure", "manga", 5);
    expect(result).toContain("A space adventure");
  });

  it("includes art style", () => {
    const result = buildFollowUpQuestionsPrompt("A space adventure", "manga", 5);
    expect(result).toContain("manga");
  });

  it("includes page count", () => {
    const result = buildFollowUpQuestionsPrompt("A space adventure", "manga", 5);
    expect(result).toContain("5");
  });

  it("instructs to return JSON array with id and question fields", () => {
    const result = buildFollowUpQuestionsPrompt("A space adventure", "manga", 5);
    expect(result).toContain('"id"');
    expect(result).toContain('"question"');
  });
});

describe("buildRandomIdeaPrompt", () => {
  it("returns a non-empty string", () => {
    const result = buildRandomIdeaPrompt();
    expect(result.length).toBeGreaterThan(0);
  });

  it("instructs to return only the premise text", () => {
    const result = buildRandomIdeaPrompt();
    expect(result).toContain("ONLY");
  });
});

describe("buildScriptPrompt", () => {
  it("includes the prompt", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3);
    expect(result).toContain("Ninja cats");
  });

  it("includes art style", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3);
    expect(result).toContain("western_comic");
  });

  it("includes page count", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3);
    expect(result).toContain("3");
  });

  it("includes follow-up answers when provided", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3, {
      q1: "Very sneaky",
    });
    expect(result).toContain("Very sneaky");
  });

  it("handles missing follow-up answers gracefully", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3, undefined);
    expect(result).toContain("No additional details provided");
  });

  it("instructs to return only valid JSON", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3);
    expect(result).toContain("ONLY valid JSON");
  });

  it("requires a characters array in the JSON structure", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3);
    expect(result).toContain('"characters"');
  });

  it("requires exhaustive character appearance descriptions", () => {
    const result = buildScriptPrompt("Ninja cats", "western_comic", 3);
    expect(result).toContain("appearance");
    expect(result).toContain("clothing");
  });
});

describe("buildScriptRegenerationPrompt", () => {
  it("includes the current script JSON", () => {
    const result = buildScriptRegenerationPrompt(
      "Ninja cats", "western_comic", 1, undefined, mockScript, "Make it funnier"
    );
    expect(result).toContain("Test Comic");
  });

  it("includes the user feedback", () => {
    const result = buildScriptRegenerationPrompt(
      "Ninja cats", "western_comic", 1, undefined, mockScript, "Make it funnier"
    );
    expect(result).toContain("Make it funnier");
  });

  it("still enforces page count rules", () => {
    const result = buildScriptRegenerationPrompt(
      "Ninja cats", "western_comic", 1, undefined, mockScript, "Make it funnier"
    );
    expect(result).toContain("ONLY valid JSON");
  });
});

describe("buildCharacterSheetPrompt", () => {
  it("includes character names", () => {
    const result = buildCharacterSheetPrompt(mockScript, "manga");
    expect(result).toContain("Detective Mira");
  });

  it("includes character appearance", () => {
    const result = buildCharacterSheetPrompt(mockScript, "manga");
    expect(result).toContain(mockCharacter.appearance);
  });

  it("mentions reference sheet purpose", () => {
    const result = buildCharacterSheetPrompt(mockScript, "manga");
    expect(result).toContain("reference sheet");
  });

  it("specifies multiple views", () => {
    const result = buildCharacterSheetPrompt(mockScript, "manga");
    expect(result).toContain("front view");
    expect(result).toContain("3/4 view");
  });

  it("uses art style description", () => {
    const result = buildCharacterSheetPrompt(mockScript, "manga");
    expect(result).toContain("manga");
  });

  it("uses custom style prompt verbatim", () => {
    const result = buildCharacterSheetPrompt(mockScript, "custom", "oil painting style");
    expect(result).toContain("oil painting style");
  });

  it("handles empty characters array gracefully", () => {
    const emptyScript = { ...mockScript, characters: [] };
    const result = buildCharacterSheetPrompt(emptyScript, "manga");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("buildPageImagePrompt", () => {
  it("includes the comic title", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("Detective Nights");
  });

  it("includes the page number and total pages", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("page 1 of 5");
  });

  it("includes panel descriptions", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("A detective examines a clue.");
  });

  it("includes dialogue", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("Interesting...");
  });

  it("includes caption when present", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("The mystery deepens.");
  });

  it("uses art style prompt fragment for presets", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("manga");
  });

  it("uses custom style prompt verbatim for custom art style", () => {
    const result = buildPageImagePrompt(mockPage, "custom", "Detective Nights", 5, "oil painting style");
    expect(result).toContain("oil painting style");
  });

  it("includes aspect ratio", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("2:3");
  });

  it("includes CHARACTER REFERENCE SHEET instruction when hasCharacterSheet is true", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5, undefined, true);
    expect(result).toContain("CHARACTER REFERENCE SHEET");
  });

  it("does not include CHARACTER REFERENCE SHEET instruction when hasCharacterSheet is false", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5, undefined, false);
    expect(result).not.toContain("CHARACTER REFERENCE SHEET");
  });

  it("includes PREVIOUS comic page instruction when hasPreviousPage is true", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5, undefined, false, true);
    expect(result).toContain("PREVIOUS comic page");
  });

  it("does not include PREVIOUS comic page instruction when hasPreviousPage is false", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5, undefined, false, false);
    expect(result).not.toContain("PREVIOUS comic page");
  });

  it("includes character appearance reference when characters are provided", () => {
    const result = buildPageImagePrompt(mockPage, "manga", "Detective Nights", 5, undefined, false, false, [mockCharacter]);
    expect(result).toContain("CHARACTER APPEARANCE REFERENCE");
    expect(result).toContain("Detective Mira");
  });
});

describe("buildJsonRetryPrompt", () => {
  it("mentions invalid JSON", () => {
    const result = buildJsonRetryPrompt();
    expect(result).toContain("not valid JSON");
  });
});
