# Comicly Color Schemes

Two options for the app's visual identity. Each includes full semantic token mapping for Tailwind CSS.

------

## Option A — "Ink & Pop"

Inspired by comic book ink on paper. High-contrast base with a bold accent that pops like a speech bubble. Feels energetic and playful without being childish.

### Palette

| Token                     | Hex       | Preview                                                  | Usage                                                        |
| ------------------------- | --------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| `--color-primary`         | `#6C3CE1` | ![#6C3CE1](https://via.placeholder.com/16/6C3CE1/6C3CE1) | Primary buttons (Create Comic, Approve), active tab, selected art style card border |
| `--color-primary-hover`   | `#5A2DC7` | ![#5A2DC7](https://via.placeholder.com/16/5A2DC7/5A2DC7) | Primary button hover state                                   |
| `--color-primary-light`   | `#EDE7FB` | ![#EDE7FB](https://via.placeholder.com/16/EDE7FB/EDE7FB) | Selected art style card background, active badge background  |
| `--color-secondary`       | `#FF6B35` | ![#FF6B35](https://via.placeholder.com/16/FF6B35/FF6B35) | Surprise Me button, regeneration counter highlight, CTA accents |
| `--color-secondary-hover` | `#E85A27` | ![#E85A27](https://via.placeholder.com/16/E85A27/E85A27) | Secondary button hover state                                 |
| `--color-bg`              | `#FAFAF9` | ![#FAFAF9](https://via.placeholder.com/16/FAFAF9/FAFAF9) | Page background (warm off-white, subtle paper feel)          |
| `--color-surface`         | `#FFFFFF` | ![#FFFFFF](https://via.placeholder.com/16/FFFFFF/FFFFFF) | Cards, modals, dropdowns, input fields                       |
| `--color-surface-alt`     | `#F5F3F0` | ![#F5F3F0](https://via.placeholder.com/16/F5F3F0/F5F3F0) | Art style card default background, code/script display area  |
| `--color-border`          | `#E2DFD9` | ![#E2DFD9](https://via.placeholder.com/16/E2DFD9/E2DFD9) | Card borders, input borders, dividers                        |
| `--color-border-focus`    | `#6C3CE1` | ![#6C3CE1](https://via.placeholder.com/16/6C3CE1/6C3CE1) | Input focus ring (matches primary)                           |
| `--color-text`            | `#1A1A1A` | ![#1A1A1A](https://via.placeholder.com/16/1A1A1A/1A1A1A) | Headings, body text, button labels                           |
| `--color-text-secondary`  | `#6B6560` | ![#6B6560](https://via.placeholder.com/16/6B6560/6B6560) | Descriptions, timestamps, placeholder text, captions         |
| `--color-text-inverse`    | `#FFFFFF` | ![#FFFFFF](https://via.placeholder.com/16/FFFFFF/FFFFFF) | Text on primary/secondary buttons                            |
| `--color-success`         | `#16A34A` | ![#16A34A](https://via.placeholder.com/16/16A34A/16A34A) | "Complete" status badge, toast success, "Link copied!"       |
| `--color-success-light`   | `#DCFCE7` | ![#DCFCE7](https://via.placeholder.com/16/DCFCE7/DCFCE7) | Success badge background                                     |
| `--color-warning`         | `#D97706` | ![#D97706](https://via.placeholder.com/16/D97706/D97706) | "Generating..." status badge, regeneration limit warning     |
| `--color-warning-light`   | `#FEF3C7` | ![#FEF3C7](https://via.placeholder.com/16/FEF3C7/FEF3C7) | Warning badge background                                     |
| `--color-error`           | `#DC2626` | ![#DC2626](https://via.placeholder.com/16/DC2626/DC2626) | Validation errors, delete button, error toasts               |
| `--color-error-light`     | `#FEE2E2` | ![#FEE2E2](https://via.placeholder.com/16/FEE2E2/FEE2E2) | Error message background                                     |
| `--color-muted`           | `#A8A29E` | ![#A8A29E](https://via.placeholder.com/16/A8A29E/A8A29E) | Disabled buttons, draft badge text                           |
| `--color-muted-light`     | `#F0EFED` | ![#F0EFED](https://via.placeholder.com/16/F0EFED/F0EFED) | Draft badge background, disabled input background            |

### Character

- Warm neutral base (stone tones) avoids the sterile feel of pure gray
- Purple primary reads as creative without being gendered
- Orange secondary is high-energy, draws attention to playful actions (Surprise Me, regenerate)
- The contrast ratio of `#1A1A1A` on `#FAFAF9` exceeds WCAG AAA

------

## Option B — "Midnight Studio"

Dark-mode-first design inspired by a creator's workspace at night. The deep background makes comic page previews glow. Accent colors are restrained and modern.

### Palette

| Token                      | Hex       | Preview                                                  | Usage                                                       |
| -------------------------- | --------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| `--color-primary`          | `#3B82F6` | ![#3B82F6](https://via.placeholder.com/16/3B82F6/3B82F6) | Primary buttons, selected art style card border, active tab |
| `--color-primary-hover`    | `#2563EB` | ![#2563EB](https://via.placeholder.com/16/2563EB/2563EB) | Primary button hover state                                  |
| `--color-primary-light`    | `#1E3A5F` | ![#1E3A5F](https://via.placeholder.com/16/1E3A5F/1E3A5F) | Selected art style card background, active badge background |
| `--color-secondary`        | `#F59E0B` | ![#F59E0B](https://via.placeholder.com/16/F59E0B/F59E0B) | Surprise Me button, regeneration counter, CTA accents       |
| `--color-secondary-hover`  | `#D97706` | ![#D97706](https://via.placeholder.com/16/D97706/D97706) | Secondary button hover state                                |
| `--color-bg`               | `#0F1117` | ![#0F1117](https://via.placeholder.com/16/0F1117/0F1117) | Page background (deep navy-black)                           |
| `--color-surface`          | `#1A1D27` | ![#1A1D27](https://via.placeholder.com/16/1A1D27/1A1D27) | Cards, modals, dropdowns, input fields                      |
| `--color-surface-alt`      | `#242836` | ![#242836](https://via.placeholder.com/16/242836/242836) | Art style card default background, script display area      |
| `--color-surface-elevated` | `#2D3245` | ![#2D3245](https://via.placeholder.com/16/2D3245/2D3245) | Hover state on cards, tooltip background                    |
| `--color-border`           | `#2D3245` | ![#2D3245](https://via.placeholder.com/16/2D3245/2D3245) | Card borders, input borders, dividers                       |
| `--color-border-focus`     | `#3B82F6` | ![#3B82F6](https://via.placeholder.com/16/3B82F6/3B82F6) | Input focus ring (matches primary)                          |
| `--color-text`             | `#F1F1F3` | ![#F1F1F3](https://via.placeholder.com/16/F1F1F3/F1F1F3) | Headings, body text, button labels on dark surfaces         |
| `--color-text-secondary`   | `#9194A1` | ![#9194A1](https://via.placeholder.com/16/9194A1/9194A1) | Descriptions, timestamps, placeholder text, captions        |
| `--color-text-inverse`     | `#FFFFFF` | ![#FFFFFF](https://via.placeholder.com/16/FFFFFF/FFFFFF) | Text on primary/secondary buttons                           |
| `--color-success`          | `#22C55E` | ![#22C55E](https://via.placeholder.com/16/22C55E/22C55E) | "Complete" status badge, toast success                      |
| `--color-success-light`    | `#14352A` | ![#14352A](https://via.placeholder.com/16/14352A/14352A) | Success badge background                                    |
| `--color-warning`          | `#EAB308` | ![#EAB308](https://via.placeholder.com/16/EAB308/EAB308) | "Generating..." badge, limit warnings                       |
| `--color-warning-light`    | `#332B0F` | ![#332B0F](https://via.placeholder.com/16/332B0F/332B0F) | Warning badge background                                    |
| `--color-error`            | `#EF4444` | ![#EF4444](https://via.placeholder.com/16/EF4444/EF4444) | Validation errors, delete button, error toasts              |
| `--color-error-light`      | `#3B1515` | ![#3B1515](https://via.placeholder.com/16/3B1515/3B1515) | Error message background                                    |
| `--color-muted`            | `#585C6B` | ![#585C6B](https://via.placeholder.com/16/585C6B/585C6B) | Disabled buttons, draft badge text                          |
| `--color-muted-light`      | `#1F222D` | ![#1F222D](https://via.placeholder.com/16/1F222D/1F222D) | Draft badge background, disabled input                      |

### Character

- Dark canvas makes comic page thumbnails and generated images pop visually
- Blue primary is neutral and highly legible on dark backgrounds
- Amber secondary adds warmth and draws the eye to creative actions
- Extra `surface-elevated` token handles the layering needed in dark UIs (card → hover → tooltip)
- Contrast ratio of `#F1F1F3` on `#0F1117` exceeds WCAG AAA

------

## Comparison

| Aspect                 | Option A — Ink & Pop                                         | Option B — Midnight Studio                                   |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Mode                   | Light                                                        | Dark                                                         |
| Personality            | Playful, approachable, comic-book energy                     | Focused, modern, creator-tool feel                           |
| Image contrast         | Images need their own shadow/border to stand out on light bg | Images glow naturally against dark bg                        |
| Implementation effort  | Lower — Tailwind defaults are light-mode                     | Slightly higher — dark mode needs explicit bg on every surface layer |
| Accessibility          | AAA on primary text                                          | AAA on primary text                                          |
| Art style card preview | Light bg may clash with some art style previews              | Dark bg works as a neutral frame for all styles              |

------

## Tailwind Integration

Map tokens to `tailwind.config.ts` under `theme.extend.colors`:

```typescript
// tailwind.config.ts (example for Option A)
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6C3CE1",
          hover: "#5A2DC7",
          light: "#EDE7FB",
        },
        secondary: {
          DEFAULT: "#FF6B35",
          hover: "#E85A27",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F5F3F0",
        },
        border: {
          DEFAULT: "#E2DFD9",
          focus: "#6C3CE1",
        },
        // ... remaining tokens
      },
    },
  },
};
```

Usage in components:

```tsx
<button className="bg-primary hover:bg-primary-hover text-text-inverse rounded-lg px-4 py-2">
  Create Comic
</button>

<div className="bg-surface border border-border rounded-xl p-6">
  <h2 className="text-text">Card Title</h2>
  <p className="text-text-secondary">Description</p>
</div>
```