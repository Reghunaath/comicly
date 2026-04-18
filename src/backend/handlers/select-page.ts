import { getComic, saveComic, selectPageVersion } from "@/backend/lib/db";

interface SelectPageResult {
  success: boolean;
  complete: boolean;
}

function validateBody(body: unknown): { pageNumber: number; versionIndex: number } {
  if (!body || typeof body !== "object") {
    throw new Error("INVALID_INPUT: Request body is required");
  }
  const { pageNumber, versionIndex } = body as Record<string, unknown>;
  if (typeof pageNumber !== "number" || !Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error("INVALID_INPUT: pageNumber must be a positive integer");
  }
  if (typeof versionIndex !== "number" || !Number.isInteger(versionIndex) || versionIndex < 0) {
    throw new Error("INVALID_INPUT: versionIndex must be a non-negative integer");
  }
  return { pageNumber, versionIndex };
}

export async function selectPage(id: string, body: unknown): Promise<SelectPageResult> {
  const { pageNumber, versionIndex } = validateBody(body);

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
