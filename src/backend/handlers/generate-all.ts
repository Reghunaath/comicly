import type { Comic } from "@/backend/lib/types";
import { getComic, saveComic, getOrCreatePage, addPageVersion } from "@/backend/lib/db";
import { uploadImage, uploadCharacterSheet } from "@/backend/lib/supabase/storage";
import { buildCharacterSheetPrompt, buildPageImagePrompt } from "@/backend/lib/ai/prompts";
import { generateCharacterSheet, generatePageImage } from "@/backend/lib/ai/image-generator";

interface GenerateAllResult {
  comic: Comic;
}

export async function generateAll(id: string): Promise<GenerateAllResult> {
  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");

  if (comic.status !== "script_approved") {
    throw new Error(`STATUS_ERROR: Cannot generate pages in status "${comic.status}"`);
  }
  if (comic.generationMode !== "automated") {
    throw new Error("STATUS_ERROR: This endpoint is for automated mode only");
  }
  if (!comic.script) {
    throw new Error("STATUS_ERROR: Comic has no script");
  }

  await saveComic({ id, status: "generating" });

  // Step 1: Character sheet (non-fatal)
  let characterSheetBuffer: Buffer | null = null;
  try {
    const sheetPrompt = buildCharacterSheetPrompt(comic.script, comic.artStyle, comic.customStylePrompt);
    characterSheetBuffer = await generateCharacterSheet(sheetPrompt);
    const sheetUrl = await uploadCharacterSheet(id, characterSheetBuffer);
    await saveComic({ id, characterSheetUrl: sheetUrl });
    console.log(`[generate-all] Character sheet generated for comic ${id}`);
  } catch (err) {
    console.warn(`[generate-all] Character sheet generation failed, continuing without: ${err}`);
  }

  // Step 2: Generate pages sequentially
  let prevPageBuffer: Buffer | null = null;

  for (const scriptPage of comic.script.pages) {
    const hasCharacterSheet = characterSheetBuffer !== null;
    const hasPreviousPage = prevPageBuffer !== null;

    const refs: Buffer[] = [];
    if (characterSheetBuffer) refs.push(characterSheetBuffer);
    if (prevPageBuffer) refs.push(prevPageBuffer);

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
    prevPageBuffer = imageBuffer;

    const imageUrl = await uploadImage(id, scriptPage.pageNumber, 0, imageBuffer);
    const pageId = await getOrCreatePage(id, scriptPage.pageNumber);
    await addPageVersion(pageId, 0, imageUrl);

    await saveComic({ id, currentPageIndex: scriptPage.pageNumber });
    console.log(`[generate-all] Page ${scriptPage.pageNumber}/${comic.pageCount} done`);
  }

  await saveComic({ id, status: "complete" });

  const completed = await getComic(id);
  if (!completed) throw new Error("NOT_FOUND: Comic not found after generation");

  return { comic: completed };
}
