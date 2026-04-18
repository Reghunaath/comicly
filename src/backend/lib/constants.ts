export const MAX_PAGES = 15;
export const MIN_PAGES = 1;
export const MAX_PANELS_PER_PAGE = 6;
export const MIN_PANELS_PER_PAGE = 2;
export const MAX_PAGE_REGENERATIONS = 3;  // 3 regens = 4 total versions
export const MAX_FOLLOW_UP_QUESTIONS = 5;

export const ART_STYLE_PRESETS = {
  manga: {
    label: "Manga",
    description: "Japanese manga style with expressive characters and dynamic compositions",
    promptFragment: "Japanese manga style with screentones, dynamic action lines, expressive eyes, and black-and-white ink aesthetic",
  },
  western_comic: {
    label: "Western Comic",
    description: "Bold American comic book style with vivid colors",
    promptFragment: "American superhero comic style with bold outlines, vivid colors, dynamic poses, and halftone dot shading",
  },
  watercolor_storybook: {
    label: "Watercolor Storybook",
    description: "Soft, dreamy watercolor illustrations",
    promptFragment: "Soft watercolor children's storybook style with gentle colors, flowing brushstrokes, and warm dreamy lighting",
  },
  minimalist_flat: {
    label: "Minimalist / Flat",
    description: "Clean, simple flat illustrations with limited colors",
    promptFragment: "Minimalist flat illustration style with simple shapes, limited color palette, clean lines, and no gradients",
  },
  vintage_newspaper: {
    label: "Vintage Newspaper",
    description: "Retro newspaper comic strip aesthetic",
    promptFragment: "Vintage newspaper comic strip style with muted colors, Ben-Day dots, retro lettering, and a yellowed paper texture",
  },
} as const;

export const IMAGE_ASPECT_RATIO = "2:3";  // Portrait for comic pages
export const IMAGE_RESOLUTION = "1K";      // Balance of quality and speed
