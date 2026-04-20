import { getComic, claimComic as claimComicInDb } from "@/backend/lib/db";
import { getRequiredUser } from "@/backend/lib/supabase/middleware";

interface ClaimComicResult {
  success: boolean;
}

export async function claimComic(id: string): Promise<ClaimComicResult> {
  const user = await getRequiredUser();

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");

  if (comic.userId !== null && comic.userId !== user.id) {
    throw new Error("FORBIDDEN: You do not own this comic");
  }

  if (comic.userId === user.id) {
    return { success: true };
  }

  await claimComicInDb(id, user.id);
  return { success: true };
}
