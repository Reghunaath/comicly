import type { ComicSummary } from "@/backend/lib/types";
import { getUserComics } from "@/backend/lib/db";
import { getRequiredUser } from "@/backend/lib/supabase/middleware";

interface GetLibraryResult {
  comics: ComicSummary[];
}

export async function getLibrary(): Promise<GetLibraryResult> {
  const user = await getRequiredUser();
  const comics = await getUserComics(user.id);
  return { comics };
}
