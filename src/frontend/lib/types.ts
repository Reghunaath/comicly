/**
 * Shared frontend types.
 *
 * These mirror src/backend/lib/types.ts (owned by Reghu). Keep in sync when
 * the backend contract changes. Import from here in all frontend code.
 */

export type ComicStatus =
  | "input"            // Comic created, awaiting follow-up answers or skip
  | "script_pending"   // Follow-ups submitted, script not yet generated
  | "script_draft"     // Script generated, awaiting user review
  | "script_approved"  // Script approved, generation mode selected
  | "generating"       // Image generation in progress
  | "complete";        // All pages generated

export type GenerationMode = "supervised" | "automated";

export type ArtStylePreset =
  | "manga"
  | "western_comic"
  | "watercolor_storybook"
  | "minimalist_flat"
  | "vintage_newspaper"
  | "custom";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_PAGES = 15;
export const MIN_PAGES = 1;
export const MAX_PANELS_PER_PAGE = 6;
export const MIN_PANELS_PER_PAGE = 2;
export const MAX_PAGE_REGENERATIONS = 3;
export const MAX_FOLLOW_UP_QUESTIONS = 5;

// ---------------------------------------------------------------------------
// Art style display metadata
// ---------------------------------------------------------------------------

export interface ArtStyleMeta {
  key: ArtStylePreset;
  label: string;
  description: string;
}

export const ART_STYLES: ArtStyleMeta[] = [
  {
    key: "manga",
    label: "Manga",
    description: "Japanese manga style with expressive characters and dynamic compositions",
  },
  {
    key: "western_comic",
    label: "Western Comic",
    description: "Bold American comic book style with vivid colors",
  },
  {
    key: "watercolor_storybook",
    label: "Watercolor Storybook",
    description: "Soft, dreamy watercolor illustrations",
  },
  {
    key: "minimalist_flat",
    label: "Minimalist / Flat",
    description: "Clean, simple flat illustrations with limited colors",
  },
  {
    key: "vintage_newspaper",
    label: "Vintage Newspaper",
    description: "Retro newspaper comic strip aesthetic",
  },
  {
    key: "custom",
    label: "Custom",
    description: "Describe your own art style",
  },
];

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

export interface FollowUpQuestion {
  id: string;
  question: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface ScriptPanel {
  panelNumber: number;
  description: string;
  dialogue: DialogueLine[];
  caption?: string;
}

export interface ScriptPage {
  pageNumber: number;
  panels: ScriptPanel[];
}

export interface Script {
  title: string;
  synopsis: string;
  pages: ScriptPage[];
}

export interface PageVersion {
  imageUrl: string;
  generatedAt: string;
}

export interface Page {
  pageNumber: number;
  versions: PageVersion[];
  selectedVersionIndex: number;
}

export interface Comic {
  id: string;
  userId: string | null;
  status: ComicStatus;
  createdAt: string;
  updatedAt: string;
  prompt: string;
  artStyle: ArtStylePreset;
  customStylePrompt?: string;
  pageCount: number;
  followUpQuestions?: FollowUpQuestion[];
  followUpAnswers?: Record<string, string>;
  script?: Script;
  generationMode?: GenerationMode;
  pages: Page[];
  currentPageIndex: number;
}

export interface ComicSummary {
  id: string;
  status: ComicStatus;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  artStyle: ArtStylePreset;
  customStylePrompt?: string;
  pageCount: number;
  thumbnailUrl: string | null;
}
