import { getComic, deleteComic as deleteComicFromDb } from "@/backend/lib/db";
import { getRequiredUser } from "@/backend/lib/supabase/middleware";
import { deleteComicImages } from "@/backend/lib/supabase/storage";

interface DeleteComicResult {
  success: boolean;
}

export async function deleteComic(id: string): Promise<DeleteComicResult> {
  const user = await getRequiredUser();

  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");

  if (comic.userId !== user.id) throw new Error("FORBIDDEN: You do not own this comic");

  await deleteComicImages(id);
  await deleteComicFromDb(id);

  return { success: true };
}
