import { getComic, claimComic as claimComicInDb } from "@/backend/lib/db";
import { getRequiredUser } from "@/backend/lib/supabase/middleware";

export async function claimComic(id: string): Promise<{ success: boolean }> {
  const user = await getRequiredUser();

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");

  // Comic already belongs to this user — idempotent success
  if (comic.userId === user.id) return { success: true };

  // Comic is owned by someone else
  if (comic.userId !== null) throw new Error("FORBIDDEN: You do not own this comic");

  await claimComicInDb(id, user.id);
  return { success: true };
}
