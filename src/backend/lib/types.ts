export type ComicStatus =
  | "input"             // Comic created, awaiting follow-up answers or skip
  | "script_pending"    // Follow-ups submitted, script not yet generated
  | "script_draft"      // Script generated, awaiting user review
  | "script_approved"   // Script approved, generation mode selected
  | "generating"        // Image generation in progress
  | "complete";         // All pages generated

export type GenerationMode = "supervised" | "automated";

export type ArtStylePreset =
  | "manga"
  | "western_comic"
  | "watercolor_storybook"
  | "minimalist_flat"
  | "vintage_newspaper"
  | "custom";

export interface Comic {
  id: string;                         // UUID
  userId: string | null;              // Supabase auth user ID, null for guests
  status: ComicStatus;
  createdAt: string;                  // ISO 8601
  updatedAt: string;                  // ISO 8601

  // User input
  prompt: string;
  artStyle: ArtStylePreset;
  customStylePrompt?: string;         // Only when artStyle === "custom"
  pageCount: number;                  // 1–15

  // Follow-up questions
  followUpQuestions?: FollowUpQuestion[];
  followUpAnswers?: Record<string, string>; // questionId -> answer

  // Script
  script?: Script;

  // Generation
  generationMode?: GenerationMode;
  characterSheetUrl?: string;
  pages: Page[];
  currentPageIndex: number;           // Tracks progress in supervised mode
}

export interface FollowUpQuestion {
  id: string;                         // e.g. "q1", "q2"
  question: string;
}

export interface Character {
  name: string;
  appearance: string;  // Exhaustive visual description (age, ethnicity, skin, height, build, hair, eyes, distinguishing features)
  clothing: string;    // Default outfit used in every panel they appear in
  personality: string; // 2-3 traits that inform pose and expression choices
}

export interface Script {
  title: string;
  synopsis: string;
  characters: Character[];
  pages: ScriptPage[];
}

export interface ScriptPage {
  pageNumber: number;                 // 1-indexed
  panels: ScriptPanel[];
}

export interface ScriptPanel {
  panelNumber: number;                // 1-indexed within the page
  description: string;                // Visual description (used for image gen prompt)
  dialogue: DialogueLine[];
  caption?: string;                   // Narrator text
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface Page {
  pageNumber: number;
  versions: PageVersion[];            // Max 4 (original + 3 regenerations)
  selectedVersionIndex: number;       // Which version the user picked
}

export interface PageVersion {
  imageUrl: string;                   // Supabase Storage public URL
  generatedAt: string;                // ISO 8601
}

// Lightweight summary used for the library grid
export interface ComicSummary {
  id: string;
  status: ComicStatus;
  createdAt: string;
  updatedAt: string;
  title: string | null;               // From script, null if no script yet
  artStyle: ArtStylePreset;
  customStylePrompt?: string;
  pageCount: number;
  thumbnailUrl: string | null;        // First page selected version image, null if no pages yet
}
