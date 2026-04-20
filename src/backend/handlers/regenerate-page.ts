import type { Page, PageVersion } from "@/backend/lib/types";
import { getComic, getOrCreatePage, addPageVersion, selectPageVersion } from "@/backend/lib/db";
import { uploadImage } from "@/backend/lib/supabase/storage";
import { buildPageImagePrompt } from "@/backend/lib/ai/prompts";
import { generatePageImage } from "@/backend/lib/ai/image-generator";
import { parseOrThrow, PageRegenerateSchema } from "@/backend/lib/validation";

const MAX_VERSIONS = 4;

interface RegeneratePageResult {
  page: Page;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function regeneratePage(
  id: string,
  body: unknown
): Promise<RegeneratePageResult> {
  const parsed = parseOrThrow(PageRegenerateSchema, body);
  const pageNumber = parsed.pageNumber;
  const feedback = typeof parsed.feedback === "string" ? parsed.feedback.trim() || undefined : undefined;

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.generationMode !== "supervised") {
    throw new Error("STATUS_ERROR: This endpoint is for supervised mode only");
  }
  if (comic.status !== "generating") {
    throw new Error(`STATUS_ERROR: Cannot regenerate page in status "${comic.status}"`);
  }
  if (!comic.script) {
    throw new Error("STATUS_ERROR: Comic has no script");
  }

  const page = comic.pages.find((p) => p.pageNumber === pageNumber);
  if (!page) {
    throw new Error(`STATUS_ERROR: Page ${pageNumber} has not been generated yet`);
  }
  if (page.versions.length >= MAX_VERSIONS) {
    throw new Error(
      `STATUS_ERROR: Maximum regeneration limit (${MAX_VERSIONS - 1}) reached for page ${pageNumber}`
    );
  }

  const scriptPage = comic.script.pages.find((p) => p.pageNumber === pageNumber);
  if (!scriptPage) {
    throw new Error(`STATUS_ERROR: Page ${pageNumber} not found in script`);
  }

  // Build reference buffers: character sheet + previous page's selected version
  const refs: Buffer[] = [];
  let hasCharacterSheet = false;
  if (comic.characterSheetUrl) {
    try {
      refs.push(await fetchBuffer(comic.characterSheetUrl));
      hasCharacterSheet = true;
    } catch {
      // Non-fatal
    }
  }

  let hasPreviousPage = false;
  const prevPage = comic.pages.find((p) => p.pageNumber === pageNumber - 1);
  if (prevPage) {
    const selectedVersion = prevPage.versions[prevPage.selectedVersionIndex];
    if (selectedVersion) {
      try {
        refs.push(await fetchBuffer(selectedVersion.imageUrl));
        hasPreviousPage = true;
      } catch {
        // Non-fatal
      }
    }
  }

  let prompt = buildPageImagePrompt(
    scriptPage,
    comic.artStyle,
    comic.script.title,
    comic.pageCount,
    comic.customStylePrompt,
    hasCharacterSheet,
    hasPreviousPage,
    comic.script.characters
  );

  if (feedback) {
    prompt += `\n\nDIRECTOR'S NOTES (apply these changes to the regenerated page):\n${feedback}`;
  }

  const imageBuffer = await generatePageImage(prompt, refs);
  const versionIndex = page.versions.length;
  const imageUrl = await uploadImage(id, pageNumber, versionIndex, imageBuffer);

  const pageId = await getOrCreatePage(id, pageNumber);
  await addPageVersion(pageId, versionIndex, imageUrl);
  await selectPageVersion(id, pageNumber, versionIndex);

  const newVersion: PageVersion = { imageUrl, generatedAt: new Date().toISOString() };
  const updatedPage: Page = {
    pageNumber,
    versions: [...page.versions, newVersion],
    selectedVersionIndex: versionIndex,
  };

  return { page: updatedPage };
}
