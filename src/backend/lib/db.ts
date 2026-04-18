import { supabaseAdmin } from "./supabase/server";
import type {
  Comic,
  ComicSummary,
  ComicStatus,
  ArtStylePreset,
  GenerationMode,
  FollowUpQuestion,
  Script,
  Page,
  PageVersion,
} from "./types";

// ---------------------------------------------------------------------------
// Raw DB row types (snake_case)
// ---------------------------------------------------------------------------

interface DbComic {
  id: string;
  user_id: string | null;
  status: ComicStatus;
  created_at: string;
  updated_at: string;
  prompt: string;
  art_style: ArtStylePreset;
  custom_style_prompt: string | null;
  page_count: number;
  follow_up_questions: FollowUpQuestion[] | null;
  follow_up_answers: Record<string, string> | null;
  script: Script | null;
  generation_mode: GenerationMode | null;
  character_sheet_url: string | null;
  current_page_index: number;
}

interface DbPageVersion {
  id: string;
  page_id: string;
  version_index: number;
  image_url: string;
  generated_at: string;
}

interface DbComicPage {
  id: string;
  comic_id: string;
  page_number: number;
  selected_version_index: number;
  created_at: string;
  page_versions?: DbPageVersion[];
}

// ---------------------------------------------------------------------------
// Mapping functions (exported for unit testing)
// ---------------------------------------------------------------------------

export function mapDbToPageVersion(version: DbPageVersion): PageVersion {
  return {
    imageUrl: version.image_url,
    generatedAt: version.generated_at,
  };
}

export function mapDbToPage(page: DbComicPage): Page {
  return {
    pageNumber: page.page_number,
    selectedVersionIndex: page.selected_version_index,
    versions: (page.page_versions ?? [])
      .sort((a, b) => a.version_index - b.version_index)
      .map(mapDbToPageVersion),
  };
}

export function mapDbToComic(
  comic: DbComic,
  pages: DbComicPage[] | null
): Comic {
  return {
    id: comic.id,
    userId: comic.user_id,
    status: comic.status,
    createdAt: comic.created_at,
    updatedAt: comic.updated_at,
    prompt: comic.prompt,
    artStyle: comic.art_style,
    customStylePrompt: comic.custom_style_prompt ?? undefined,
    pageCount: comic.page_count,
    followUpQuestions: comic.follow_up_questions ?? undefined,
    followUpAnswers: comic.follow_up_answers ?? undefined,
    script: comic.script ?? undefined,
    generationMode: comic.generation_mode ?? undefined,
    characterSheetUrl: comic.character_sheet_url ?? undefined,
    currentPageIndex: comic.current_page_index,
    pages: (pages ?? []).map(mapDbToPage),
  };
}

export function mapDbToSummary(
  comic: DbComic,
  firstPage?: DbComicPage
): ComicSummary {
  let thumbnailUrl: string | null = null;
  if (firstPage) {
    const selected = (firstPage.page_versions ?? []).find(
      (v) => v.version_index === firstPage.selected_version_index
    );
    thumbnailUrl = selected?.image_url ?? null;
  }

  return {
    id: comic.id,
    status: comic.status,
    createdAt: comic.created_at,
    updatedAt: comic.updated_at,
    title: comic.script?.title ?? null,
    artStyle: comic.art_style,
    customStylePrompt: comic.custom_style_prompt ?? undefined,
    pageCount: comic.page_count,
    thumbnailUrl,
  };
}

export function mapComicToDb(
  comic: Partial<Comic> & { id: string }
): Partial<DbComic> & { id: string } {
  const db: Partial<DbComic> & { id: string } = { id: comic.id };

  if (comic.userId !== undefined) db.user_id = comic.userId;
  if (comic.status !== undefined) db.status = comic.status;
  if (comic.prompt !== undefined) db.prompt = comic.prompt;
  if (comic.artStyle !== undefined) db.art_style = comic.artStyle;
  if (comic.customStylePrompt !== undefined)
    db.custom_style_prompt = comic.customStylePrompt;
  if (comic.pageCount !== undefined) db.page_count = comic.pageCount;
  if (comic.followUpQuestions !== undefined)
    db.follow_up_questions = comic.followUpQuestions;
  if (comic.followUpAnswers !== undefined)
    db.follow_up_answers = comic.followUpAnswers;
  if (comic.script !== undefined) db.script = comic.script;
  if (comic.generationMode !== undefined)
    db.generation_mode = comic.generationMode;
  if (comic.characterSheetUrl !== undefined)
    db.character_sheet_url = comic.characterSheetUrl ?? null;
  if (comic.currentPageIndex !== undefined)
    db.current_page_index = comic.currentPageIndex;

  return db;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

export async function getComic(id: string): Promise<Comic | null> {
  const { data: comic, error } = await supabaseAdmin
    .from("comics")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !comic) return null;

  const { data: pages } = await supabaseAdmin
    .from("comic_pages")
    .select("*, page_versions(*)")
    .eq("comic_id", id)
    .order("page_number");

  return mapDbToComic(comic as DbComic, pages as DbComicPage[] | null);
}

export async function insertComic(
  comic: Partial<Comic> & { id: string }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("comics")
    .insert(mapComicToDb(comic));

  if (error) throw error;
}

export async function saveComic(
  comic: Partial<Comic> & { id: string }
): Promise<void> {
  const { id, ...rest } = mapComicToDb(comic);
  const { error } = await supabaseAdmin
    .from("comics")
    .update(rest)
    .eq("id", id);

  if (error) throw error;
}

export async function getUserComics(userId: string): Promise<ComicSummary[]> {
  const { data: comics, error } = await supabaseAdmin
    .from("comics")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!comics || comics.length === 0) return [];

  const comicIds = (comics as DbComic[]).map((c) => c.id);
  const { data: firstPages } = await supabaseAdmin
    .from("comic_pages")
    .select("*, page_versions(*)")
    .in("comic_id", comicIds)
    .eq("page_number", 1);

  const firstPageByComicId = new Map(
    ((firstPages ?? []) as DbComicPage[]).map((p) => [p.comic_id, p])
  );

  return (comics as DbComic[]).map((comic) =>
    mapDbToSummary(comic, firstPageByComicId.get(comic.id))
  );
}

export async function deleteComic(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("comics").delete().eq("id", id);
  if (error) throw error;
}

export async function getOrCreatePage(
  comicId: string,
  pageNumber: number
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("comic_pages")
    .upsert(
      { comic_id: comicId, page_number: pageNumber },
      { onConflict: "comic_id,page_number" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export async function getPageVersionCount(pageId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("page_versions")
    .select("*", { count: "exact", head: true })
    .eq("page_id", pageId);

  if (error) throw error;
  return count ?? 0;
}

export async function addPageVersion(
  pageId: string,
  versionIndex: number,
  imageUrl: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("page_versions").insert({
    page_id: pageId,
    version_index: versionIndex,
    image_url: imageUrl,
  });

  if (error) throw error;
}

export async function selectPageVersion(
  comicId: string,
  pageNumber: number,
  versionIndex: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("comic_pages")
    .update({ selected_version_index: versionIndex })
    .eq("comic_id", comicId)
    .eq("page_number", pageNumber);

  if (error) throw error;
}
