import { supabaseAdmin } from "./server";

const BUCKET = "comics";

export async function uploadImage(
  comicId: string,
  pageNumber: number,
  versionIndex: number,
  imageBuffer: Buffer
): Promise<string> {
  const path = `${comicId}/page-${pageNumber}-v${versionIndex}.png`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCharacterSheet(
  comicId: string,
  imageBuffer: Buffer
): Promise<string> {
  const path = `${comicId}/character-sheet.png`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteComicImages(comicId: string): Promise<void> {
  const { data: files } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(comicId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${comicId}/${f.name}`);
    await supabaseAdmin.storage.from(BUCKET).remove(paths);
  }
}
