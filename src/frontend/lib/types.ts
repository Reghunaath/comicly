/**
 * Frontend type entry point.
 *
 * All shared types are re-exported from the canonical backend definition.
 * Only frontend-specific UI types (ArtStyleMeta, ART_STYLES) are defined here.
 */

import type { ArtStylePreset } from "@/backend/lib/types";

export type {
  ComicStatus,
  GenerationMode,
  ArtStylePreset,
  Comic,
  ComicSummary,
  FollowUpQuestion,
  Character,
  Script,
  ScriptPage,
  ScriptPanel,
  DialogueLine,
  Page,
  PageVersion,
} from "@/backend/lib/types";

export {
  MAX_PAGES,
  MIN_PAGES,
  MAX_PANELS_PER_PAGE,
  MIN_PANELS_PER_PAGE,
  MAX_PAGE_REGENERATIONS,
  MAX_FOLLOW_UP_QUESTIONS,
} from "@/backend/lib/constants";

// ── Frontend-only: UI display metadata for art styles ────────────────────────

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
