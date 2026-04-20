import { describe, it, expect } from "vitest";
import {
  parseOrThrow,
  CreateComicSchema,
  RefineComicSchema,
  RegenerateScriptSchema,
  ApproveComicSchema,
  PageGenerateSchema,
  PageRegenerateSchema,
  PageSelectSchema,
} from "../validation";

function expectInvalidInput(fn: () => unknown, fragment: string) {
  expect(fn).toThrow(expect.objectContaining({ message: expect.stringContaining("INVALID_INPUT:") }));
  expect(fn).toThrow(expect.objectContaining({ message: expect.stringContaining(fragment) }));
}

// ---------------------------------------------------------------------------
// CreateComicSchema
// ---------------------------------------------------------------------------

describe("CreateComicSchema", () => {
  const valid = { prompt: "A cat detective", artStyle: "manga", pageCount: 5 };

  it("accepts valid input", () => {
    expect(parseOrThrow(CreateComicSchema, valid)).toMatchObject(valid);
  });

  it("accepts custom art style with customStylePrompt", () => {
    const input = { ...valid, artStyle: "custom", customStylePrompt: "noir pencil sketches" };
    expect(() => parseOrThrow(CreateComicSchema, input)).not.toThrow();
  });

  it("rejects missing prompt", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, { ...valid, prompt: undefined }), "prompt");
  });

  it("rejects empty prompt", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, { ...valid, prompt: "" }), "prompt");
  });

  it("rejects invalid artStyle", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, { ...valid, artStyle: "oil_painting" }), "artStyle");
  });

  it("rejects custom artStyle without customStylePrompt", () => {
    expectInvalidInput(
      () => parseOrThrow(CreateComicSchema, { ...valid, artStyle: "custom" }),
      "customStylePrompt"
    );
  });

  it("rejects custom artStyle with empty customStylePrompt", () => {
    expectInvalidInput(
      () => parseOrThrow(CreateComicSchema, { ...valid, artStyle: "custom", customStylePrompt: "   " }),
      "customStylePrompt"
    );
  });

  it("rejects pageCount below minimum", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, { ...valid, pageCount: 0 }), "pageCount");
  });

  it("rejects pageCount above maximum", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, { ...valid, pageCount: 16 }), "pageCount");
  });

  it("rejects non-integer pageCount", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, { ...valid, pageCount: 3.5 }), "pageCount");
  });

  it("rejects missing fields", () => {
    expectInvalidInput(() => parseOrThrow(CreateComicSchema, {}), "prompt");
  });
});

// ---------------------------------------------------------------------------
// RefineComicSchema
// ---------------------------------------------------------------------------

describe("RefineComicSchema", () => {
  it("accepts valid answers object", () => {
    const input = { answers: { q1: "Inspector Whiskers", q2: "diamond heist" } };
    expect(parseOrThrow(RefineComicSchema, input)).toEqual(input);
  });

  it("accepts empty answers object", () => {
    expect(() => parseOrThrow(RefineComicSchema, { answers: {} })).not.toThrow();
  });

  it("rejects missing answers", () => {
    expectInvalidInput(() => parseOrThrow(RefineComicSchema, {}), "answers");
  });

  it("rejects answers as an array", () => {
    expectInvalidInput(() => parseOrThrow(RefineComicSchema, { answers: ["q1"] }), "answers");
  });

  it("rejects answers with non-string values", () => {
    expectInvalidInput(() => parseOrThrow(RefineComicSchema, { answers: { q1: 42 } }), "answers");
  });
});

// ---------------------------------------------------------------------------
// RegenerateScriptSchema
// ---------------------------------------------------------------------------

describe("RegenerateScriptSchema", () => {
  it("accepts valid feedback", () => {
    expect(parseOrThrow(RegenerateScriptSchema, { feedback: "Make the villain sympathetic" })).toEqual({
      feedback: "Make the villain sympathetic",
    });
  });

  it("rejects missing feedback", () => {
    expectInvalidInput(() => parseOrThrow(RegenerateScriptSchema, {}), "feedback");
  });

  it("rejects empty feedback", () => {
    expectInvalidInput(() => parseOrThrow(RegenerateScriptSchema, { feedback: "" }), "feedback");
  });

  it("rejects feedback over 2000 characters", () => {
    expectInvalidInput(
      () => parseOrThrow(RegenerateScriptSchema, { feedback: "x".repeat(2001) }),
      "feedback"
    );
  });

  it("rejects non-string feedback", () => {
    expectInvalidInput(() => parseOrThrow(RegenerateScriptSchema, { feedback: 123 }), "feedback");
  });
});

// ---------------------------------------------------------------------------
// ApproveComicSchema
// ---------------------------------------------------------------------------

describe("ApproveComicSchema", () => {
  const script = { title: "Test", synopsis: "A story", characters: [], pages: [] };

  it("accepts supervised mode", () => {
    const result = parseOrThrow(ApproveComicSchema, { script, generationMode: "supervised" });
    expect(result.generationMode).toBe("supervised");
  });

  it("accepts automated mode", () => {
    const result = parseOrThrow(ApproveComicSchema, { script, generationMode: "automated" });
    expect(result.generationMode).toBe("automated");
  });

  it("rejects missing script", () => {
    expectInvalidInput(() => parseOrThrow(ApproveComicSchema, { generationMode: "automated" }), "script");
  });

  it("rejects script as a string", () => {
    expectInvalidInput(() => parseOrThrow(ApproveComicSchema, { script: "not an object", generationMode: "automated" }), "script");
  });

  it("rejects invalid generationMode", () => {
    expectInvalidInput(() => parseOrThrow(ApproveComicSchema, { script, generationMode: "batch" }), "generationMode");
  });

  it("rejects missing generationMode", () => {
    expectInvalidInput(() => parseOrThrow(ApproveComicSchema, { script }), "generationMode");
  });
});

// ---------------------------------------------------------------------------
// PageGenerateSchema
// ---------------------------------------------------------------------------

describe("PageGenerateSchema", () => {
  it("accepts a valid pageNumber", () => {
    expect(parseOrThrow(PageGenerateSchema, { pageNumber: 1 })).toEqual({ pageNumber: 1 });
  });

  it("rejects missing pageNumber", () => {
    expectInvalidInput(() => parseOrThrow(PageGenerateSchema, {}), "pageNumber");
  });

  it("rejects pageNumber of 0", () => {
    expectInvalidInput(() => parseOrThrow(PageGenerateSchema, { pageNumber: 0 }), "pageNumber");
  });

  it("rejects negative pageNumber", () => {
    expectInvalidInput(() => parseOrThrow(PageGenerateSchema, { pageNumber: -1 }), "pageNumber");
  });

  it("rejects non-integer pageNumber", () => {
    expectInvalidInput(() => parseOrThrow(PageGenerateSchema, { pageNumber: 1.5 }), "pageNumber");
  });

  it("rejects string pageNumber", () => {
    expectInvalidInput(() => parseOrThrow(PageGenerateSchema, { pageNumber: "1" }), "pageNumber");
  });
});

// ---------------------------------------------------------------------------
// PageRegenerateSchema
// ---------------------------------------------------------------------------

describe("PageRegenerateSchema", () => {
  it("accepts pageNumber without feedback", () => {
    expect(parseOrThrow(PageRegenerateSchema, { pageNumber: 2 })).toMatchObject({ pageNumber: 2 });
  });

  it("accepts pageNumber with feedback", () => {
    const result = parseOrThrow(PageRegenerateSchema, { pageNumber: 2, feedback: "Warmer colours" });
    expect(result).toMatchObject({ pageNumber: 2, feedback: "Warmer colours" });
  });

  it("rejects missing pageNumber", () => {
    expectInvalidInput(() => parseOrThrow(PageRegenerateSchema, {}), "pageNumber");
  });

  it("rejects pageNumber below 1", () => {
    expectInvalidInput(() => parseOrThrow(PageRegenerateSchema, { pageNumber: 0 }), "pageNumber");
  });

  it("rejects feedback over 2000 characters", () => {
    expectInvalidInput(
      () => parseOrThrow(PageRegenerateSchema, { pageNumber: 1, feedback: "x".repeat(2001) }),
      "feedback"
    );
  });

  it("rejects non-string feedback", () => {
    expectInvalidInput(() => parseOrThrow(PageRegenerateSchema, { pageNumber: 1, feedback: 99 }), "feedback");
  });
});

// ---------------------------------------------------------------------------
// PageSelectSchema
// ---------------------------------------------------------------------------

describe("PageSelectSchema", () => {
  it("accepts valid pageNumber and versionIndex", () => {
    expect(parseOrThrow(PageSelectSchema, { pageNumber: 3, versionIndex: 0 })).toEqual({
      pageNumber: 3,
      versionIndex: 0,
    });
  });

  it("accepts versionIndex of 0", () => {
    expect(() => parseOrThrow(PageSelectSchema, { pageNumber: 1, versionIndex: 0 })).not.toThrow();
  });

  it("rejects missing pageNumber", () => {
    expectInvalidInput(() => parseOrThrow(PageSelectSchema, { versionIndex: 0 }), "pageNumber");
  });

  it("rejects missing versionIndex", () => {
    expectInvalidInput(() => parseOrThrow(PageSelectSchema, { pageNumber: 1 }), "versionIndex");
  });

  it("rejects negative versionIndex", () => {
    expectInvalidInput(() => parseOrThrow(PageSelectSchema, { pageNumber: 1, versionIndex: -1 }), "versionIndex");
  });

  it("rejects non-integer versionIndex", () => {
    expectInvalidInput(() => parseOrThrow(PageSelectSchema, { pageNumber: 1, versionIndex: 0.5 }), "versionIndex");
  });

  it("rejects pageNumber below 1", () => {
    expectInvalidInput(() => parseOrThrow(PageSelectSchema, { pageNumber: 0, versionIndex: 0 }), "pageNumber");
  });
});
