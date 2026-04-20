import { getComic, saveComic, selectPageVersion } from "@/backend/lib/db";
import { parseOrThrow, PageSelectSchema } from "@/backend/lib/validation";

interface SelectPageResult {
  success: boolean;
  complete: boolean;
}

export async function selectPage(id: string, body: unknown): Promise<SelectPageResult> {
  const { pageNumber, versionIndex } = parseOrThrow(PageSelectSchema, body);

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.generationMode !== "supervised") {
    throw new Error("STATUS_ERROR: This endpoint is for supervised mode only");
  }
  if (comic.status !== "generating") {
    throw new Error(`STATUS_ERROR: Cannot select page version in status "${comic.status}"`);
  }

  const page = comic.pages.find((p) => p.pageNumber === pageNumber);
  if (!page) {
    throw new Error(`STATUS_ERROR: Page ${pageNumber} has not been generated yet`);
  }
  if (versionIndex >= page.versions.length) {
    throw new Error(
      `INVALID_INPUT: versionIndex ${versionIndex} is out of range (page has ${page.versions.length} versions)`
    );
  }

  await selectPageVersion(id, pageNumber, versionIndex);

  const isLastPage = pageNumber === comic.pageCount;
  if (isLastPage) {
    await saveComic({ id, status: "complete" });
  }

  return { success: true, complete: isLastPage };
}
