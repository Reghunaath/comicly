import { describe, it, expect, vi } from "vitest";

vi.mock("@/backend/lib/supabase/server", () => ({
  supabaseAdmin: {},
}));

import {
  mapDbToPageVersion,
  mapDbToPage,
  mapDbToComic,
  mapDbToSummary,
  mapComicToDb,
} from "../db";

const dbVersion = {
  id: "v1",
  page_id: "p1",
  version_index: 0,
  image_url: "https://example.com/image.png",
  generated_at: "2026-04-01T00:00:00Z",
};

const dbPage = {
  id: "p1",
  comic_id: "c1",
  page_number: 1,
  selected_version_index: 0,
  created_at: "2026-04-01T00:00:00Z",
  page_versions: [dbVersion],
};

const dbComic = {
  id: "c1",
  user_id: "u1",
  status: "script_draft" as const,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T01:00:00Z",
  prompt: "A ninja cat",
  art_style: "manga" as const,
  custom_style_prompt: null,
  page_count: 3,
  follow_up_questions: [{ id: "q1", question: "Name?" }],
  follow_up_answers: { q1: "Whiskers" },
  script: { title: "Ninja Cat", synopsis: "A short tale.", pages: [] },
  generation_mode: null,
  current_page_index: 0,
};

describe("mapDbToPageVersion", () => {
  it("maps image_url to imageUrl", () => {
    expect(mapDbToPageVersion(dbVersion).imageUrl).toBe(
      "https://example.com/image.png"
    );
  });

  it("maps generated_at to generatedAt", () => {
    expect(mapDbToPageVersion(dbVersion).generatedAt).toBe(
      "2026-04-01T00:00:00Z"
    );
  });
});

describe("mapDbToPage", () => {
  it("maps page_number to pageNumber", () => {
    expect(mapDbToPage(dbPage).pageNumber).toBe(1);
  });

  it("maps selected_version_index to selectedVersionIndex", () => {
    expect(mapDbToPage(dbPage).selectedVersionIndex).toBe(0);
  });

  it("maps page_versions to versions array", () => {
    expect(mapDbToPage(dbPage).versions).toHaveLength(1);
    expect(mapDbToPage(dbPage).versions[0].imageUrl).toBe(
      "https://example.com/image.png"
    );
  });

  it("sorts versions by version_index", () => {
    const pageWithMultiple = {
      ...dbPage,
      page_versions: [
        { ...dbVersion, version_index: 2, image_url: "img2.png" },
        { ...dbVersion, version_index: 0, image_url: "img0.png" },
        { ...dbVersion, version_index: 1, image_url: "img1.png" },
      ],
    };
    const result = mapDbToPage(pageWithMultiple);
    expect(result.versions[0].imageUrl).toBe("img0.png");
    expect(result.versions[1].imageUrl).toBe("img1.png");
    expect(result.versions[2].imageUrl).toBe("img2.png");
  });

  it("handles missing page_versions gracefully", () => {
    const pageWithoutVersions = { ...dbPage, page_versions: undefined };
    expect(mapDbToPage(pageWithoutVersions).versions).toHaveLength(0);
  });
});

describe("mapDbToComic", () => {
  it("maps all snake_case fields to camelCase", () => {
    const result = mapDbToComic(dbComic, [dbPage]);
    expect(result.id).toBe("c1");
    expect(result.userId).toBe("u1");
    expect(result.artStyle).toBe("manga");
    expect(result.pageCount).toBe(3);
    expect(result.createdAt).toBe("2026-04-01T00:00:00Z");
    expect(result.updatedAt).toBe("2026-04-01T01:00:00Z");
    expect(result.currentPageIndex).toBe(0);
  });

  it("maps null custom_style_prompt to undefined", () => {
    const result = mapDbToComic(dbComic, null);
    expect(result.customStylePrompt).toBeUndefined();
  });

  it("maps null generation_mode to undefined", () => {
    const result = mapDbToComic(dbComic, null);
    expect(result.generationMode).toBeUndefined();
  });

  it("maps follow_up_questions correctly", () => {
    const result = mapDbToComic(dbComic, null);
    expect(result.followUpQuestions).toEqual([{ id: "q1", question: "Name?" }]);
  });

  it("maps script correctly", () => {
    const result = mapDbToComic(dbComic, null);
    expect(result.script?.title).toBe("Ninja Cat");
  });

  it("maps pages array", () => {
    const result = mapDbToComic(dbComic, [dbPage]);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].pageNumber).toBe(1);
  });

  it("returns empty pages when pages is null", () => {
    const result = mapDbToComic(dbComic, null);
    expect(result.pages).toHaveLength(0);
  });
});

describe("mapDbToSummary", () => {
  it("uses script title", () => {
    const result = mapDbToSummary(dbComic, dbPage);
    expect(result.title).toBe("Ninja Cat");
  });

  it("returns null title when no script", () => {
    const comicWithoutScript = { ...dbComic, script: null };
    const result = mapDbToSummary(comicWithoutScript, undefined);
    expect(result.title).toBeNull();
  });

  it("returns thumbnail from selected version", () => {
    const result = mapDbToSummary(dbComic, dbPage);
    expect(result.thumbnailUrl).toBe("https://example.com/image.png");
  });

  it("returns null thumbnail when no first page", () => {
    const result = mapDbToSummary(dbComic, undefined);
    expect(result.thumbnailUrl).toBeNull();
  });

  it("returns null thumbnail when selected version not found", () => {
    const pageWithWrongIndex = {
      ...dbPage,
      selected_version_index: 5,
    };
    const result = mapDbToSummary(dbComic, pageWithWrongIndex);
    expect(result.thumbnailUrl).toBeNull();
  });

  it("maps all base fields correctly", () => {
    const result = mapDbToSummary(dbComic, undefined);
    expect(result.id).toBe("c1");
    expect(result.status).toBe("script_draft");
    expect(result.artStyle).toBe("manga");
    expect(result.pageCount).toBe(3);
  });
});

describe("mapComicToDb", () => {
  it("always includes id", () => {
    const result = mapComicToDb({ id: "c1" });
    expect(result.id).toBe("c1");
  });

  it("maps camelCase fields to snake_case", () => {
    const result = mapComicToDb({
      id: "c1",
      artStyle: "western_comic",
      pageCount: 5,
      currentPageIndex: 2,
    });
    expect(result.art_style).toBe("western_comic");
    expect(result.page_count).toBe(5);
    expect(result.current_page_index).toBe(2);
  });

  it("omits fields that are not provided", () => {
    const result = mapComicToDb({ id: "c1", status: "generating" });
    expect(result.status).toBe("generating");
    expect(result.art_style).toBeUndefined();
    expect(result.page_count).toBeUndefined();
  });

  it("maps userId to user_id", () => {
    const result = mapComicToDb({ id: "c1", userId: "u1" });
    expect(result.user_id).toBe("u1");
  });

  it("maps generationMode to generation_mode", () => {
    const result = mapComicToDb({ id: "c1", generationMode: "automated" });
    expect(result.generation_mode).toBe("automated");
  });
});
