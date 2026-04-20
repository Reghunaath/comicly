import type { Page, PageVersion } from "@/backend/lib/types";
import { getComic, saveComic, getOrCreatePage, addPageVersion } from "@/backend/lib/db";
import { uploadImage, uploadCharacterSheet } from "@/backend/lib/supabase/storage";
import { buildCharacterSheetPrompt, buildPageImagePrompt } from "@/backend/lib/ai/prompts";
import { generatePageImage, generateCharacterSheet } from "@/backend/lib/ai/image-generator";
import { parseOrThrow, PageGenerateSchema } from "@/backend/lib/validation";

interface GeneratePageResult {
  page: Page;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function generatePage(id: string, body: unknown): Promise<GeneratePageResult> {
  const { pageNumber } = parseOrThrow(PageGenerateSchema, body);

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.generationMode !== "supervised") {
    throw new Error("STATUS_ERROR: This endpoint is for supervised mode only");
  }
  if (comic.status !== "script_approved" && comic.status !== "generating") {
    throw new Error(`STATUS_ERROR: Cannot generate page in status "${comic.status}"`);
  }
  if (!comic.script) {
    throw new Error("STATUS_ERROR: Comic has no script");
  }
  if (pageNumber > comic.pageCount) {
    throw new Error(`INVALID_INPUT: pageNumber ${pageNumber} exceeds pageCount ${comic.pageCount}`);
  }

  const scriptPage = comic.script.pages.find((p) => p.pageNumber === pageNumber);
  if (!scriptPage) {
    throw new Error(`STATUS_ERROR: Page ${pageNumber} not found in script`);
  }

  // Generate character sheet on first page if not already created
  let characterSheetUrl = comic.characterSheetUrl;
  if (!characterSheetUrl) {
    try {
      const sheetPrompt = buildCharacterSheetPrompt(
        comic.script,
        comic.artStyle,
        comic.customStylePrompt
      );
      const sheetBuffer = await generateCharacterSheet(sheetPrompt);
      characterSheetUrl = await uploadCharacterSheet(id, sheetBuffer);
      await saveComic({ id, characterSheetUrl });
      console.log(`[generate-page] Character sheet generated for comic ${id}`);
    } catch (err) {
      console.warn(`[generate-page] Character sheet generation failed, continuing without: ${err}`);
    }
  }

  // Build reference buffers: character sheet + previous page's selected version
  const refs: Buffer[] = [];
  let hasCharacterSheet = false;
  if (characterSheetUrl) {
    try {
      refs.push(await fetchBuffer(characterSheetUrl));
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

  const prompt = buildPageImagePrompt(
    scriptPage,
    comic.artStyle,
    comic.script.title,
    comic.pageCount,
    comic.customStylePrompt,
    hasCharacterSheet,
    hasPreviousPage,
    comic.script.characters
  );

  const imageBuffer = await generatePageImage(prompt, refs);
  const versionIndex = 0;
  const imageUrl = await uploadImage(id, pageNumber, versionIndex, imageBuffer);

  const pageId = await getOrCreatePage(id, pageNumber);
  await addPageVersion(pageId, versionIndex, imageUrl);

  await saveComic({ id, status: "generating", currentPageIndex: pageNumber });

  const version: PageVersion = { imageUrl, generatedAt: new Date().toISOString() };
  const page: Page = { pageNumber, versions: [version], selectedVersionIndex: 0 };

  return { page };
}
