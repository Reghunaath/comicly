import { describe, it, expect } from "vitest";
import {
  buildFollowUpQuestionsPrompt,
  buildRandomIdeaPrompt,
  buildScriptPrompt,
  buildScriptRegenerationPrompt,
  buildImagePrompt,
  buildJsonRetryPrompt,
} from "../prompts";
import type { Script, ScriptPage } from "@/backend/lib/types";

const mockScript: Script = {
  title: "Test Comic",
  synopsis: "A test synopsis.",
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

describe("buildImagePrompt", () => {
  it("includes the comic title", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("Detective Nights");
  });

  it("includes the page number and total pages", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("page 1 of 5");
  });

  it("includes panel descriptions", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("A detective examines a clue.");
  });

  it("includes dialogue", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("Interesting...");
  });

  it("includes caption when present", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("The mystery deepens.");
  });

  it("uses art style prompt fragment for presets", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("manga");
  });

  it("uses custom style prompt verbatim for custom art style", () => {
    const result = buildImagePrompt(mockPage, "custom", "Detective Nights", 5, "oil painting style");
    expect(result).toContain("oil painting style");
  });

  it("includes aspect ratio", () => {
    const result = buildImagePrompt(mockPage, "manga", "Detective Nights", 5);
    expect(result).toContain("2:3");
  });
});

describe("buildJsonRetryPrompt", () => {
  it("mentions invalid JSON", () => {
    const result = buildJsonRetryPrompt();
    expect(result).toContain("not valid JSON");
  });
});
