import type { Comic } from "@/backend/lib/types";
import { getComic as getComicFromDb } from "@/backend/lib/db";

interface GetComicResult {
  comic: Comic;
}

export async function getComic(id: string): Promise<GetComicResult> {
  const comic = await getComicFromDb(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  return { comic };
}
