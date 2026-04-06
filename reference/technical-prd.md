# Comicly — Technical PRD

**Version:** 1.0  
**Last Updated:** April 2026  
**Audience:** Two developers using Claude Code — one for frontend, one for backend API routes and AI pipeline.  
**Non-technical requirements:** See `comicly-prd-v1.md` for product goals, user stories, and feature descriptions.

---

## 1. Architecture Overview

Comicly is a Next.js application (App Router) deployed on Vercel. The frontend is a React SPA-style wizard flow. The backend is a set of Next.js API routes that orchestrate a multi-stage AI pipeline using Google Gemini for text generation and Nano Banana Pro for image generation.

There are no user accounts. Each comic is identified by a UUID. The creator's browser stores their comic IDs in localStorage for retrieval. Shared comics are accessed directly via `/comic/[id]`.

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│  Next.js App Router (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │ Landing   │ │ Wizard   │ │ Comic Viewer/Reader  ││
│  │ Page      │ │ Flow     │ │ (also share target)  ││
│  └──────────┘ └──────────┘ └──────────────────────┘│
│                      │                               │
│                      ▼                               │
│              REST API calls                          │
├─────────────────────────────────────────────────────┤
│                     Backend                          │
│  Next.js API Routes (/api/*)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │ Comic    │ │ AI       │ │ Export                ││
│  │ CRUD     │ │ Pipeline │ │ (PDF)                 ││
│  └──────────┘ └──────────┘ └──────────────────────┘│
│                      │                               │
│         ┌────────────┼────────────┐                  │
│         ▼            ▼            ▼                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Vercel   │ │ Vercel   │ │ Gemini   │            │
│  │ KV       │ │ Blob     │ │ API      │            │
│  │ (metadata)│ │ (images) │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | Single repo, frontend + backend |
| Language | TypeScript | Strict mode enabled |
| Frontend UI | React 19 + Tailwind CSS 4 | No component library required, but shadcn/ui is fine if preferred |
| Text AI | Google Gemini (`gemini-2.5-flash`) | Script generation, follow-up questions, random idea generator |
| Image AI | Nano Banana Pro (`gemini-3-pro-image-preview`) | Panel image generation via `@google/genai` SDK |
| Metadata Storage | Upstash Redis (`@upstash/redis`) | Comic objects (JSON). Free tier: 256MB, 10k commands/day. Created via Vercel dashboard. |
| Image Storage | Vercel Blob | Generated panel images. Free tier: 250MB |
| PDF Export | `jspdf` (client-side) | Lightweight, no server-side dependency |
| Deployment | Vercel | Serverless functions, edge network |
| Package Manager | pnpm | |

### SDK Details

Install the Google GenAI SDK:
```
pnpm add @google/genai
```

The SDK is used server-side only (in API routes). Never expose the API key to the client.

### Environment Variables

```env
GEMINI_API_KEY=           # Google AI Studio API key
KV_REST_API_URL=          # Vercel KV connection (auto-set when linked)
KV_REST_API_TOKEN=        # Vercel KV token (auto-set when linked)
BLOB_READ_WRITE_TOKEN=    # Vercel Blob token (auto-set when linked)
NEXT_PUBLIC_BASE_URL=     # e.g. https://comicly.vercel.app (used for share links)
```

---

## 3. Project Structure

```
comicly/
├── src/
│   ├── app/                          # Next.js routing (thin layer only)
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page (prompt, art style, page count)
│   │   ├── create/
│   │   │   └── page.tsx              # Q&A step (follow-up questions)
│   │   ├── script/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Script review + mode selection
│   │   ├── review/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Supervised mode: page-by-page review
│   │   ├── library/
│   │   │   └── page.tsx              # Library of previously generated comics
│   │   ├── comic/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Final comic viewer (creator + shared reader)
│   │   └── api/
│   │       └── comic/
│   │           ├── route.ts                    # POST: create comic (calls backend handler)
│   │           ├── batch/
│   │           │   └── route.ts                # POST: fetch multiple comics
│   │           ├── random-idea/
│   │           │   └── route.ts                # GET: generate random idea
│   │           └── [id]/
│   │               ├── route.ts                # GET: fetch comic
│   │               ├── refine/
│   │               │   └── route.ts            # POST: submit follow-up answers
│   │               ├── script/
│   │               │   ├── generate/
│   │               │   │   └── route.ts        # POST: generate script
│   │               │   └── regenerate/
│   │               │       └── route.ts        # POST: regenerate with feedback
│   │               ├── approve/
│   │               │   └── route.ts            # PUT: approve script + set mode
│   │               ├── page/
│   │               │   ├── generate/
│   │               │   │   └── route.ts        # POST: generate one page
│   │               │   ├── regenerate/
│   │               │   │   └── route.ts        # POST: regenerate a page
│   │               │   └── select/
│   │               │       └── route.ts        # PUT: select page version
│   │               ├── generate-all/
│   │               │   └── route.ts            # POST: automated mode
│   │               └── export/
│   │                   └── pdf/
│   │                       └── route.ts        # GET: export PDF
│   ├── backend/                      # All backend logic (owned by backend developer)
│   │   ├── lib/
│   │   │   ├── types.ts              # Shared TypeScript types (contract for both devs)
│   │   │   ├── constants.ts          # Art styles, limits, defaults
│   │   │   ├── storage.ts            # Storage abstraction (KV + Blob)
│   │   │   └── ai/
│   │   │       ├── gemini-client.ts  # Gemini client singleton
│   │   │       ├── prompts.ts        # All prompt templates
│   │   │       ├── script-generator.ts  # Script generation pipeline
│   │   │       └── image-generator.ts   # Image generation pipeline
│   │   └── handlers/                 # Request handler logic (one file per route group)
│   │       ├── create-comic.ts
│   │       ├── get-comic.ts
│   │       ├── batch-comics.ts
│   │       ├── random-idea.ts
│   │       ├── refine-comic.ts
│   │       ├── generate-script.ts
│   │       ├── regenerate-script.ts
│   │       ├── approve-comic.ts
│   │       ├── generate-page.ts
│   │       ├── regenerate-page.ts
│   │       ├── select-page.ts
│   │       └── generate-all.ts
│   └── frontend/                     # All React components (owned by frontend developer)
│       ├── landing/                  # Landing page components
│       ├── qa/                       # Q&A step components
│       ├── script-review/            # Script review + mode selection components
│       ├── page-review/              # Supervised mode page review components
│       ├── library/                  # Library page components (comic cards, grid)
│       ├── comic-viewer/             # Final comic reader components
│       └── ui/                       # Shared UI primitives
├── public/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

> **Structure rule:** `src/app/api/` route files are thin Next.js handlers only — no business logic. All logic lives in `src/backend/handlers/`. The frontend developer owns `src/frontend/` and `src/app/` page files. The backend developer owns `src/backend/` and `src/app/api/`.

---

## 4. Data Models

All types live in `src/backend/lib/types.ts`. Both developers import from here.

```typescript
// ============================================================
// Core Types — src/lib/types.ts
// ============================================================

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
  id: string;                         // UUIDv4
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
  pages: Page[];
  currentPageIndex: number;           // Tracks progress in supervised mode
}

export interface FollowUpQuestion {
  id: string;                         // e.g. "q1", "q2"
  question: string;
}

export interface Script {
  title: string;
  synopsis: string;
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
  imageUrl: string;                   // Vercel Blob URL
  generatedAt: string;                // ISO 8601
}
```

---

## 5. API Contract

This is the interface between the frontend and backend developers. The frontend developer calls these endpoints. The backend developer implements them.

All endpoints return JSON. Errors return `{ error: string }` with an appropriate HTTP status code.

### 5.1 Create Comic

```
POST /api/comic
```

Creates a new comic and generates follow-up questions based on the prompt.

**Request Body:**
```json
{
  "prompt": "A detective cat solves mysteries in a steampunk city",
  "artStyle": "manga",
  "customStylePrompt": null,
  "pageCount": 5
}
```

**Response (201):**
```json
{
  "comicId": "a1b2c3d4-...",
  "followUpQuestions": [
    { "id": "q1", "question": "What's the cat detective's name and personality?" },
    { "id": "q2", "question": "Is the steampunk city dark and gritty or bright and whimsical?" },
    { "id": "q3", "question": "What kind of mystery is the cat solving?" }
  ]
}
```

**Backend logic:**
1. Validate inputs (prompt non-empty, pageCount 1–15, artStyle valid).
2. Generate a UUIDv4.
3. Call Gemini to generate up to 5 follow-up questions based on the prompt and art style.
4. Save the Comic object to KV with status `"input"`.
5. Return the comic ID and questions.

---

### 5.2 Generate Random Idea

```
GET /api/comic/random-idea
```

Returns a random comic idea generated by AI.

**Response (200):**
```json
{
  "idea": "A retired astronaut opens a bakery on Mars, but the sourdough starter has developed sentience."
}
```

**Backend logic:**
1. Call Gemini with a prompt that generates a creative, varied, one-sentence comic premise.
2. Return the idea string.

---

### 5.3 Submit Follow-Up Answers

```
POST /api/comic/[id]/refine
```

Submits answers to follow-up questions. All questions are optional — the user can submit an empty object to skip.

**Request Body:**
```json
{
  "answers": {
    "q1": "Inspector Whiskers — grumpy, wears a monocle",
    "q3": "A stolen clockwork diamond"
  }
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Backend logic:**
1. Load comic from KV. Verify status is `"input"`.
2. Store answers on the comic object.
3. Update status to `"script_pending"`.
4. Save to KV.

---

### 5.4 Generate Script

```
POST /api/comic/[id]/script/generate
```

Generates the full comic script based on the user's prompt, preferences, and follow-up answers.

**Request Body:** None

**Response (200):**
```json
{
  "script": {
    "title": "Inspector Whiskers and the Clockwork Diamond",
    "synopsis": "A grumpy cat detective navigates the steam-filled streets...",
    "pages": [
      {
        "pageNumber": 1,
        "panels": [
          {
            "panelNumber": 1,
            "description": "Wide establishing shot of a steampunk city at dusk. Gears and smokestacks line the skyline. A small cat silhouette stands on a rooftop.",
            "dialogue": [],
            "caption": "In the city of Cogsworth, where brass and steam rule all..."
          },
          {
            "panelNumber": 2,
            "description": "Close-up of Inspector Whiskers at his desk. He's a grumpy orange tabby wearing a monocle and a tiny bowler hat. Papers are scattered everywhere.",
            "dialogue": [
              { "speaker": "Whiskers", "text": "Another missing artifact. This city never sleeps." }
            ],
            "caption": null
          }
        ]
      }
    ]
  }
}
```

**Backend logic:**
1. Load comic from KV. Verify status is `"script_pending"`.
2. Build the script generation prompt (see Section 6 — AI Pipeline).
3. Call Gemini. Parse the structured JSON response.
4. Validate: script must have exactly `comic.pageCount` pages, each page must have 2–6 panels.
5. Store script on comic. Update status to `"script_draft"`.
6. Save to KV.

---

### 5.5 Regenerate Script with Feedback

```
POST /api/comic/[id]/script/regenerate
```

Regenerates the script incorporating user feedback.

**Request Body:**
```json
{
  "feedback": "Make the villain more sympathetic and add a plot twist in the middle"
}
```

**Response (200):** Same shape as 5.4.

**Backend logic:**
1. Load comic. Verify status is `"script_draft"`.
2. Build prompt including the current script and the user's feedback.
3. Call Gemini. Parse and validate.
4. Replace the script on the comic. Keep status as `"script_draft"`.
5. Save to KV.

---

### 5.6 Approve Script

```
PUT /api/comic/[id]/approve
```

Approves the script (optionally with edits) and selects the generation mode.

**Request Body:**
```json
{
  "script": { ... },
  "generationMode": "supervised"
}
```

The `script` field contains the full script object. If the user edited it in the UI, this contains their edited version. If they approved as-is, the frontend sends the unmodified script back.

**Response (200):**
```json
{
  "success": true
}
```

**Backend logic:**
1. Load comic. Verify status is `"script_draft"`.
2. Validate the script structure (correct page count, panel counts).
3. Store the approved script and generation mode.
4. Update status to `"script_approved"`.
5. Initialize empty `pages` array.
6. Save to KV.

---

### 5.7 Generate Single Page (Supervised Mode)

```
POST /api/comic/[id]/page/generate
```

Generates the image for a single page.

**Request Body:**
```json
{
  "pageNumber": 1
}
```

**Response (200):**
```json
{
  "page": {
    "pageNumber": 1,
    "versions": [
      {
        "imageUrl": "https://abcdef.public.blob.vercel-storage.com/comic-xyz/page-1-v1.png",
        "generatedAt": "2026-04-04T12:00:00Z"
      }
    ],
    "selectedVersionIndex": 0
  }
}
```

**Backend logic:**
1. Load comic. Verify status is `"script_approved"` or `"generating"`.
2. Verify generation mode is `"supervised"`.
3. Build the image generation prompt for this page (see Section 6).
4. Call Nano Banana Pro. Extract the base64 image from the response.
5. Upload the image to Vercel Blob.
6. Add or update the Page entry in the comic's pages array.
7. Update status to `"generating"` if not already.
8. Save to KV.

---

### 5.8 Regenerate Page (Supervised Mode)

```
POST /api/comic/[id]/page/regenerate
```

Regenerates a page. Maximum 3 regenerations (4 total versions).

**Request Body:**
```json
{
  "pageNumber": 1
}
```

**Response (200):** Same shape as 5.7, but with an additional version appended.

**Response (400) — limit reached:**
```json
{
  "error": "Maximum regeneration limit (3) reached for this page."
}
```

**Backend logic:**
1. Load comic. Verify page exists and has fewer than 4 versions.
2. Generate a new image (same prompt, Nano Banana Pro will produce a different result).
3. Upload to Blob. Append the new version.
4. Save to KV.

---

### 5.9 Select Page Version (Supervised Mode)

```
PUT /api/comic/[id]/page/select
```

Selects which version of a page to use in the final comic.

**Request Body:**
```json
{
  "pageNumber": 1,
  "versionIndex": 2
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Backend logic:**
1. Load comic. Verify the page and version index exist.
2. Set `selectedVersionIndex` on the page.
3. If this is the last page and it now has a selected version, update status to `"complete"`.
4. Save to KV.

---

### 5.10 Generate All Pages (Automated Mode)

```
POST /api/comic/[id]/generate-all
```

Generates all pages sequentially. This is a long-running request. The frontend should show a loading state and poll or wait.

**Request Body:** None

**Response (200):**
```json
{
  "comic": { ... }
}
```

Returns the full Comic object with all pages populated.

**Backend logic:**
1. Load comic. Verify status is `"script_approved"` and mode is `"automated"`.
2. Update status to `"generating"`.
3. Loop through each script page sequentially:
   a. Build the image prompt.
   b. Call Nano Banana Pro.
   c. Upload to Blob.
   d. Append the page to the comic's pages array.
   e. Save to KV after each page (so progress is persisted even if the request times out).
4. After all pages are generated, update status to `"complete"`.
5. Return the full comic.

**Important timeout consideration:** Vercel's Hobby plan has a 60-second function timeout. Pro plan has 300 seconds. If generating 15 pages takes longer than the timeout, the request will fail partway through. Mitigations:
- The backend saves progress after each page, so the frontend can poll `GET /api/comic/[id]` to see partial progress.
- The frontend should poll `GET /api/comic/[id]` every 5 seconds during automated generation to display progress and detect completion.
- If the POST request times out, the frontend detects this, switches to polling, and the backend state already reflects how many pages were generated.
- For the hackathon, consider limiting automated mode to 5–8 pages to stay within timeout limits.

---

### 5.11 Get Comic

```
GET /api/comic/[id]
```

Returns the full comic object. Used by the comic viewer, the share page, and for polling during generation.

**Response (200):**
```json
{
  "comic": { ... }
}
```

**Response (404):**
```json
{
  "error": "Comic not found"
}
```

---

### 5.12 Batch Fetch Comics

```
POST /api/comic/batch
```

Fetches multiple comics by ID in a single request. Used by the library page to hydrate the full list without making N individual requests.

**Request Body:**
```json
{
  "ids": ["a1b2c3d4-...", "e5f6g7h8-...", "i9j0k1l2-..."]
}
```

**Response (200):**
```json
{
  "comics": [
    {
      "id": "a1b2c3d4-...",
      "status": "complete",
      "createdAt": "2026-04-04T10:00:00Z",
      "title": "Inspector Whiskers and the Clockwork Diamond",
      "artStyle": "manga",
      "pageCount": 5,
      "thumbnailUrl": "https://abcdef.public.blob.vercel-storage.com/comic-xyz/page-1-v1.png"
    }
  ]
}
```

The response returns a lightweight summary for each comic, not the full Comic object. This keeps the payload small for the library grid. Fields returned: `id`, `status`, `createdAt`, `updatedAt`, `title` (from script, or null), `artStyle`, `customStylePrompt`, `pageCount`, `thumbnailUrl` (first page's selected version image URL, or null).

IDs that don't match a stored comic are silently omitted from the response (no error). This handles the case where a comic was deleted server-side but the client still has the ID in localStorage.

**Backend logic:**
1. Validate that `ids` is an array with a max of 50 entries.
2. Fetch each comic from KV using `Promise.all` (or KV `mget` if available).
3. Map each comic to the summary shape.
4. Return only the comics that were found.

---

### 5.13 Export PDF

```
GET /api/comic/[id]/export/pdf
```

Returns a downloadable PDF of the comic.

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="comic-title.pdf"`
- Body: PDF binary

**Backend logic:**
1. Load comic. Verify status is `"complete"`.
2. For each page, fetch the selected version's image from Blob.
3. Assemble a PDF with one page per comic page. Each PDF page contains the panel image at full width.
4. Return the PDF as a binary stream.

**Implementation:** Use `jspdf` or `pdf-lib` server-side. Alternatively, the frontend developer can implement this entirely client-side using `jspdf` to avoid a server round-trip — the images are already loaded in the browser.

---

## 6. AI Pipeline (Backend)

All AI logic lives in `src/backend/lib/ai/`. The pipeline has four stages, each with its own prompt template.

### 6.1 Gemini Client Setup

```typescript
// src/backend/lib/ai/gemini-client.ts
import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

### 6.2 Models Used

| Task | Model | Model String |
|------|-------|-------------|
| Follow-up question generation | Gemini 2.5 Flash | `gemini-2.5-flash` |
| Random idea generation | Gemini 2.5 Flash | `gemini-2.5-flash` |
| Script generation | Gemini 2.5 Flash | `gemini-2.5-flash` |
| Script regeneration | Gemini 2.5 Flash | `gemini-2.5-flash` |
| Panel image generation | Nano Banana Pro | `gemini-3-pro-image-preview` |

### 6.3 Prompt Templates

All prompt templates live in `src/lib/ai/prompts.ts`. Below are the prompt strategies for each stage. The backend developer should implement these as template functions that accept the relevant comic data and return a prompt string.

#### Stage 1: Follow-Up Question Generation

**Input:** User prompt, art style, page count.  
**Output:** Up to 5 questions (JSON array).

```
System: You are a creative comic book editor. Given a user's comic idea, generate up to 5 short follow-up questions that would help personalize the story. Focus on character details, setting specifics, tone, and plot preferences. Do NOT ask about art style or length — those are already decided.

Respond with ONLY a JSON array of objects with "id" and "question" fields. No other text.

Example:
[
  {"id": "q1", "question": "What's the main character's personality like?"},
  {"id": "q2", "question": "Should the ending be happy, bittersweet, or a cliffhanger?"}
]

User's idea: "{prompt}"
Art style: "{artStyle}"
Number of pages: {pageCount}
```

#### Stage 2: Random Idea Generation

```
System: Generate a single creative, fun, and specific comic book premise in one to two sentences. Be imaginative and varied — mix genres, settings, and characters. Do not repeat common tropes. Return ONLY the premise text, nothing else.
```

#### Stage 3: Script Generation

**Input:** Prompt, art style, page count, follow-up answers.  
**Output:** Full Script object (JSON).

```
System: You are a professional comic book writer. Write a complete comic script based on the user's input.

Rules:
- The script MUST have exactly {pageCount} pages.
- Each page MUST have between 2 and 6 panels.
- Each panel MUST include a "description" field with a detailed visual description suitable for an AI image generator. Include character appearances, poses, expressions, camera angles, lighting, and background details.
- Dialogue should be natural and fit the genre.
- Captions are optional narrator text.
- The story must have a clear beginning, middle, and end.
- Respond with ONLY valid JSON matching this exact structure, no other text:

{
  "title": "string",
  "synopsis": "string (2-3 sentences)",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "description": "Detailed visual description...",
          "dialogue": [{"speaker": "Name", "text": "What they say"}],
          "caption": "Optional narrator text or null"
        }
      ]
    }
  ]
}

User's idea: "{prompt}"
Art style: "{artStyle}"
Number of pages: {pageCount}
Additional details from the user:
{formattedFollowUpAnswers}
```

#### Stage 4: Script Regeneration

Same as Stage 3, but with the current script and user feedback appended:

```
...same system prompt as Stage 3...

Here is the current script that the user wants revised:
{currentScriptJSON}

The user's feedback on what to change:
"{feedback}"

Rewrite the script incorporating this feedback while keeping the same structure requirements.
```

#### Stage 5: Panel Image Generation

**Input:** Script page data, art style, comic title, page context.  
**Output:** A single composite image of the comic page.

```
Create a single comic book page illustration in {artStyleDescription} style.

This is page {pageNumber} of {totalPages} in a comic called "{title}".

The page has {panelCount} panels arranged in a comic book layout:

{panelDescriptions}

Important instructions:
- Render this as a SINGLE comic book page with clearly defined panel borders.
- Include speech bubbles with the dialogue text inside each panel.
- Include caption boxes for narrator text where specified.
- Maintain consistent character appearances across all panels.
- The overall style must be: {artStyleDescription}
- Use a {aspectRatio} aspect ratio.
```

The `artStyleDescription` mapping:

| Preset | Description for Prompt |
|--------|----------------------|
| `manga` | "Japanese manga style with screentones, dynamic action lines, expressive eyes, and black-and-white ink aesthetic" |
| `western_comic` | "American superhero comic style with bold outlines, vivid colors, dynamic poses, and halftone dot shading" |
| `watercolor_storybook` | "Soft watercolor children's storybook style with gentle colors, flowing brushstrokes, and warm dreamy lighting" |
| `minimalist_flat` | "Minimalist flat illustration style with simple shapes, limited color palette, clean lines, and no gradients" |
| `vintage_newspaper` | "Vintage newspaper comic strip style with muted colors, Ben-Day dots, retro lettering, and a yellowed paper texture" |
| `custom` | The user's custom style prompt, used verbatim |

#### Image Generation Code Pattern

```typescript
// src/backend/lib/ai/image-generator.ts
import { ai } from "./gemini-client";

export async function generatePageImage(
  prompt: string,
  aspectRatio: string = "2:3"  // portrait orientation for comic pages
): Promise<Buffer> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: "1K",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("No image returned from Nano Banana Pro");
}
```

### 6.4 Structured Output Parsing

All text-based Gemini calls that expect JSON should:

1. Include "Respond with ONLY valid JSON" in the prompt.
2. Parse the response with `JSON.parse()`.
3. Wrap parsing in try/catch. If parsing fails, retry once with a follow-up prompt: "Your previous response was not valid JSON. Please try again with ONLY valid JSON, no markdown fences or extra text."
4. Validate the parsed object against expected structure before saving.

---

## 7. Frontend Screens and Flow

### 7.1 Page Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page. Prompt input, art style selector, page count input, and "Create Comic" CTA. "My Comics" link to `/library`. |
| `/create?id=` | Q&A step. Displays follow-up questions generated when the comic was created. User answers (all optional) and submits to generate the script. |
| `/script/[id]` | Script review page. User reads the generated script, can edit it inline or regenerate with feedback. Selects mode (supervised/automated) and approves. In automated mode, shows generation progress inline; redirects to `/comic/[id]` when done. |
| `/review/[id]` | Supervised mode page-by-page review. User triggers generation for each page, reviews the result, and can regenerate with an optional prompt. When all pages are approved, redirects to `/comic/[id]`. |
| `/library` | Library of all previously generated comics. Grid of comic cards with thumbnails, titles, and status. |
| `/comic/[id]` | Final comic viewer. Shows the complete comic. Also serves as the share link target. |

### 7.2 Landing Page (`/`)

The home page is where the user starts. It contains:
- App name and tagline.
- A prominent **text area** for the comic idea/prompt.
- A **"Surprise Me"** button that calls `GET /api/comic/random-idea` and fills the text area.
- **Art style selector**: 6 cards (5 presets + Custom). When Custom is selected, show a text input for the style prompt.
- **Page count**: number input or slider, range 1–15.
- A **"Create Comic"** button that calls `POST /api/comic` with the entered values and navigates to `/create?id=<comicId>` on success.
- A **"My Comics"** link/button that navigates to `/library`.

### 7.3 Q&A Page (`/create?id=`)

The comic ID is passed via `?id=` query param. The comic has already been created (and follow-up questions generated) by the landing page before the user arrives here.

- On mount, fetches the comic via `GET /api/comic/[id]` to retrieve the follow-up questions.
- Displays up to 5 questions. Each has a text input. All are optional.
- "Skip All" and "Submit" buttons. Both call `POST /api/comic/[id]/refine` with the answers, then redirect to `/script/[id]`.

### 7.4 Script Review Page (`/script/[id]`)

- On mount, calls `POST /api/comic/[id]/script/generate`. Shows a loading state while generating.
- Displays the script in a readable format: title, synopsis, then each page with its panels.
- **Action buttons:**
  - **"Regenerate"** — reveals a text input for optional feedback, then calls `POST /api/comic/[id]/script/regenerate` and refreshes the displayed script.
  - **"Edit"** — makes the script text editable inline (direct text editing of the script JSON fields).
- **Mode selection:** Two cards — "Supervised" and "Automated" with descriptions. User must select one before approving.
- **"Approve" button** — calls `PUT /api/comic/[id]/approve` with the selected mode.
  - If **automated**: shows inline generation progress ("Generating page 3 of 8..."), calls `POST /api/comic/[id]/generate-all`, polls `GET /api/comic/[id]` every 5 seconds for progress, then redirects to `/comic/[id]` on completion.
  - If **supervised**: redirects to `/review/[id]`.

### 7.5 Supervised Page Review (`/review/[id]`)

Handles page-by-page generation and review for supervised mode.

- On mount, fetches the comic via `GET /api/comic/[id]` to determine which pages have been generated so far.
- Shows the current page number being worked on (e.g. "Page 2 of 5").
- **"Generate Page" button** — calls `POST /api/comic/[id]/page/generate` for the current page number. Shows a loading state while generating.
- After the image loads, displays it with:
  - **"Approve"** — calls `PUT /api/comic/[id]/page/select` with `selectedVersionIndex`, then advances to the next page. After the last page is approved, redirects to `/comic/[id]`.
  - **"Regenerate"** — reveals a text input for an optional prompt, calls `POST /api/comic/[id]/page/regenerate`. Shows a regeneration counter (e.g. "1 of 3 regenerations used").
  - **Version thumbnails** — if multiple versions exist, clicking a thumbnail previews that version before approving.

### 7.6 Comic Viewer (`/comic/[id]`)

- Fetches the comic via `GET /api/comic/[id]`.
- If comic is not found, show a 404 state.
- If comic is still generating, show progress and the pages generated so far.
- If complete, display the full comic.
- Layout: vertical scroll. Each page is displayed as a full-width image with the page number.
- Top bar shows the comic title.
- Action buttons (visible to creator, not distinguishable since there are no accounts — just always show them):
  - "Share" — copies the current URL to clipboard (the URL is the share link).
  - "Export PDF" — triggers PDF download. Calls `GET /api/comic/[id]/export/pdf` or generates client-side.

### 7.7 Library Page (`/library`)

Displays all comics the current user has created, pulled from localStorage IDs and hydrated from the API.

**On mount:**
1. Read the comic ID list from `localStorage` (`comicly_my_comics`).
2. Call `POST /api/comic/batch` with all stored IDs to fetch comic metadata in a single request.
3. Display the results as a grid of comic cards.

**Comic card contents:**
- Thumbnail: the first page's selected version image (if available). Fallback to a placeholder if the comic is still in progress.
- Title: from the script, or "Untitled" if no script exists yet.
- Status badge: "Draft" (pre-generation), "Generating..." (in progress), "Complete".
- Art style label.
- Page count.
- Created date (relative, e.g. "2 hours ago").

**Card actions:**
- Click the card to navigate to `/comic/[id]` (if complete) or the appropriate in-progress page (`/create?id=`, `/script/[id]`, or `/review/[id]` depending on comic status) to resume.
- Delete button: removes the comic ID from localStorage. Does not delete server-side data (no auth to verify ownership). Shows a confirmation dialog first.

**Empty state:** If no comics exist in localStorage, show a message with a CTA to create the first comic.

**Sorting:** Most recently created first (based on `createdAt`).

### 7.8 Client-Side State

The frontend stores comic IDs in `localStorage` under the key `comicly_my_comics`:

```typescript
// Array of { comicId: string, title: string, createdAt: string, status: ComicStatus }
const myComics = JSON.parse(localStorage.getItem("comicly_my_comics") || "[]");
```

The localStorage entry should be updated at two points:
- When a new comic is created (`POST /api/comic` returns successfully), add an entry.
- When the comic viewer or library page fetches fresh data, update the title and status for that entry.

This is best-effort — clearing browser data loses access (acceptable for a hackathon).

---

## 8. Storage Layer

### 8.1 Abstraction

Create a storage abstraction in `src/backend/lib/storage.ts` so the backend developer can swap implementations.

```typescript
// src/backend/lib/storage.ts

export interface StorageAdapter {
  getComic(id: string): Promise<Comic | null>;
  getComicsBatch(ids: string[]): Promise<Comic[]>;
  saveComic(comic: Comic): Promise<void>;
  uploadImage(comicId: string, pageNumber: number, versionIndex: number, imageBuffer: Buffer): Promise<string>; // returns URL
  getImageBuffer(url: string): Promise<Buffer>;
}
```

### 8.2 Upstash Redis + Vercel Blob Implementation (Production)

```typescript
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Comic metadata
await redis.set(`comic:${id}`, JSON.stringify(comic));
const data = await redis.get<string>(`comic:${id}`);

// Image upload
const blob = await put(
  `comics/${comicId}/page-${pageNumber}-v${versionIndex}.png`,
  imageBuffer,
  { access: "public", contentType: "image/png" }
);
// blob.url is the public URL
```

Upstash Redis is created via the Vercel dashboard (Storage tab). The `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars are auto-populated when linked.

### 8.3 In-Memory Implementation (Local Dev Fallback)

For local development without Vercel KV/Blob configured, use an in-memory Map. This works because `next dev` runs a persistent Node process.

```typescript
const comics = new Map<string, Comic>();
const images = new Map<string, Buffer>();
```

Use an environment variable to toggle: `STORAGE_BACKEND=memory` vs `STORAGE_BACKEND=vercel` (default).

---

## 9. PDF Export

**Recommended approach: Client-side generation.**

The comic viewer already has all images loaded. Use `jspdf` in the browser:

```typescript
import jsPDF from "jspdf";

async function exportPDF(comic: Comic) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [800, 1200] });

  for (let i = 0; i < comic.pages.length; i++) {
    const page = comic.pages[i];
    const version = page.versions[page.selectedVersionIndex];

    if (i > 0) pdf.addPage();

    // Load image and add to PDF
    const img = await loadImage(version.imageUrl);
    pdf.addImage(img, "PNG", 0, 0, 800, 1200);
  }

  pdf.save(`${comic.script?.title || "comic"}.pdf`);
}
```

If server-side export is preferred, implement it in the API route using `pdf-lib` instead (works in Node without canvas dependencies).

---

## 10. Constants

```typescript
// src/backend/lib/constants.ts

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
```

---

## 11. Deployment

### Vercel Setup

1. Create a new Vercel project linked to the Git repo.
2. Add environment variables in Vercel dashboard.
3. Create a Vercel KV store and link it to the project (auto-populates KV env vars).
4. Create a Vercel Blob store and link it (auto-populates Blob env vars).
5. Deploy.

### Function Configuration

For the long-running automated generation endpoint, configure a longer timeout in `next.config.ts`:

```typescript
// next.config.ts
export default {
  serverExternalPackages: ["@google/genai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};
```

And in the route file:

```typescript
// src/app/api/comic/[id]/generate-all/route.ts
export const maxDuration = 300; // 5 minutes (requires Vercel Pro plan)
// Or 60 for Hobby plan
```

---

## 12. Developer Responsibilities

### Frontend Developer Scope

- Landing page (`/`)
- Creation wizard (`/create`) with all 5 steps
- Library page (`/library`) with comic grid, thumbnails, and status
- Comic viewer (`/comic/[id]`)
- All components in `src/frontend/`
- Client-side localStorage management
- Client-side PDF export
- All UI components and styling
- Loading states, error handling, and edge cases in the UI
- Responsive design (desktop-first, mobile-usable)

### Backend Developer Scope

- All API route files under `src/app/api/` (thin handlers only)
- All handler logic in `src/backend/handlers/`
- Storage layer (`src/backend/lib/storage.ts`)
- AI pipeline (`src/backend/lib/ai/`)
- All prompt engineering and Gemini/Nano Banana Pro integration
- Shared types (`src/backend/lib/types.ts`)
- Constants (`src/backend/lib/constants.ts`)
- Environment variable configuration
- Vercel KV and Blob setup

### Shared / Coordination

- The `src/backend/lib/types.ts` file is the contract. Both developers depend on it. The backend developer owns it, but changes should be communicated.
- The API contract (Section 5) should not change without both developers agreeing.
- The backend developer should build and test endpoints independently using a tool like `curl` or Postman before the frontend integrates.

---

## 13. Risk and Limitations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Nano Banana Pro rate limits | Image generation could be throttled during demos | Check rate limits on free tier before hackathon. Generate pages sequentially, not in parallel. |
| Vercel function timeout (60s on Hobby) | Automated mode for long comics may fail | Save progress after each page. Frontend polls for partial state. Limit automated mode to ~8 pages. |
| Gemini returns malformed JSON | Script generation fails | Retry once with a correction prompt. Validate all parsed output. |
| Image generation safety filters | Some prompts may be blocked by Nano Banana Pro's content policy | Catch these errors gracefully. Show a message to the user suggesting they adjust their idea. |
| Upstash Redis limits (256MB / 10k cmds/day free tier) | Could fill up if many comics are created | Each comic is ~50KB of metadata. 256MB supports ~5000 comics. 10k commands/day is ample for a hackathon demo. |
| Blob storage limits (250MB free tier) | Images are larger — ~200KB–500KB each | A 15-page comic with 4 versions per page = ~30MB worst case. Supports ~8 full comics. Sufficient for a demo. |

---

## 14. Sequence Diagrams

### Comic Creation (Supervised Mode)

```
User              Frontend              Backend API           Gemini / Nano Banana
 │                   │                      │                        │
 │  Enter idea +     │                      │                        │
 │  preferences      │                      │                        │
 │──────────────────>│                      │                        │
 │                   │  POST /api/comic     │                        │
 │                   │─────────────────────>│                        │
 │                   │                      │  Generate questions     │
 │                   │                      │───────────────────────>│
 │                   │                      │<───────────────────────│
 │                   │  { comicId, questions}│                        │
 │                   │<─────────────────────│                        │
 │  Answer questions │                      │                        │
 │──────────────────>│                      │                        │
 │                   │  POST /refine        │                        │
 │                   │─────────────────────>│                        │
 │                   │<─────────────────────│                        │
 │                   │  POST /script/generate│                       │
 │                   │─────────────────────>│                        │
 │                   │                      │  Generate script        │
 │                   │                      │───────────────────────>│
 │                   │                      │<───────────────────────│
 │                   │  { script }          │                        │
 │                   │<─────────────────────│                        │
 │  Review + Approve │                      │                        │
 │──────────────────>│                      │                        │
 │                   │  PUT /approve        │                        │
 │                   │─────────────────────>│                        │
 │                   │<─────────────────────│                        │
 │                   │                      │                        │
 │  (For each page)  │                      │                        │
 │                   │  POST /page/generate │                        │
 │                   │─────────────────────>│                        │
 │                   │                      │  Generate page image    │
 │                   │                      │───────────────────────>│
 │                   │                      │<───────────────────────│
 │                   │                      │  Upload to Blob         │
 │                   │  { page }            │                        │
 │                   │<─────────────────────│                        │
 │  Approve page     │                      │                        │
 │──────────────────>│                      │                        │
 │                   │  PUT /page/select    │                        │
 │                   │─────────────────────>│                        │
 │                   │<─────────────────────│                        │
 │  (repeat)         │                      │                        │
 │                   │                      │                        │
 │  View comic       │                      │                        │
 │──────────────────>│  GET /comic/[id]     │                        │
 │                   │─────────────────────>│                        │
 │                   │<─────────────────────│                        │
 │<──────────────────│                      │                        │
```

---

## 15. Quick Start for Each Developer

### Backend Developer

1. Clone the repo. Run `pnpm install`.
2. Create `.env.local` with `GEMINI_API_KEY` and `STORAGE_BACKEND=memory`.
3. Start with `src/backend/lib/types.ts` and `src/backend/lib/constants.ts`.
4. Build `src/backend/lib/ai/gemini-client.ts`, `prompts.ts`, `script-generator.ts`, `image-generator.ts`.
5. Build `src/backend/lib/storage.ts` (start with in-memory).
6. Implement handlers in `src/backend/handlers/`, one at a time.
7. Wire each handler to its thin route file in `src/app/api/`, starting with `POST /api/comic` and `GET /api/comic/[id]`.
8. Test each route with curl.
9. When ready for deployment, add Vercel KV/Blob and implement the Vercel storage adapter.

### Frontend Developer

1. Clone the repo. Run `pnpm install`.
2. Start with the landing page and wizard shell.
3. Build each wizard step as a component. Mock the API responses initially if the backend isn't ready.
4. Build the library page and comic card component.
5. Build the comic viewer page.
6. Integrate with the real API endpoints as the backend developer completes them.
7. Add PDF export last.

---

## 16. Development Epics

Each epic produces a working, demoable product. Do not start the next epic until the current one is fully functional end-to-end.

---

### Epic 1 — Core Generation Loop

**Demo outcome:** A user enters a comic idea, picks an art style and page count, reviews a generated script, approves it, and gets a fully generated comic they can scroll through.

This epic builds the minimum viable path from idea to finished comic. Automated mode only. No follow-up questions, no script editing, no regeneration. Just the straight-line happy path.

#### Frontend

**Landing page (`/`)**
- App name and tagline.
- Prominent text area for the comic idea/prompt.
- "Surprise Me" button that calls `GET /api/comic/random-idea` and fills the text area.
- Art style selector: 6 cards (5 presets + Custom with text input).
- Page count input (1–15).
- "Create Comic" button that calls `POST /api/comic` with the entered values and navigates to `/create?id=<comicId>` on success.
- Minimal styling. Does not need to be polished yet.

**Wizard (`/create`) — 2 steps only**

*Step 1 — Follow-Up Questions:*
- On mount, fetches comic via `GET /api/comic/[id]` to get follow-up questions.
- Displays up to 5 questions. All optional.
- "Skip All" and "Next" buttons. Both call `POST /api/comic/[id]/refine` and advance to Step 2.

*Step 2 — Script Review:*
- Calls `POST /api/comic/[id]/script/generate` on mount. Shows loading state.
- Displays the script in a readable format: title, synopsis, pages with panels.
- Single button: "Approve & Generate Comic".
- Calls `PUT /api/comic/[id]/approve` with `generationMode: "automated"`, then calls `POST /api/comic/[id]/generate-all`.
- Shows a progress indicator ("Generating page 3 of 8...").
- Polls `GET /api/comic/[id]` every 5 seconds to update progress.
- On completion, redirects to `/comic/[id]`.

*No Step 3 (mode selection) in this epic — automated mode is hardcoded.*

**Comic Viewer (`/comic/[id]`)**
- Fetches comic via `GET /api/comic/[id]`.
- Displays pages as a vertical scroll of full-width images.
- Shows the comic title at the top.
- 404 state if comic not found.
- No share button, no export button yet.

**Client-side state:**
- Save the comic ID to localStorage after creation so it survives page refresh during generation.

#### Backend

**API routes to implement:**
- `POST /api/comic` — Create comic. In this epic, skip follow-up question generation. Return `comicId` with an empty `followUpQuestions` array.
- `POST /api/comic/[id]/script/generate` — Generate the full script via Gemini.
- `PUT /api/comic/[id]/approve` — Approve script, store generation mode.
- `POST /api/comic/[id]/generate-all` — Generate all page images sequentially via Nano Banana Pro. Save progress after each page.
- `GET /api/comic/[id]` — Return the full comic object.

**AI pipeline:**
- `gemini-client.ts` — Gemini client singleton.
- `prompts.ts` — Script generation prompt template and image generation prompt template.
- `script-generator.ts` — Calls Gemini, parses JSON, validates structure.
- `image-generator.ts` — Calls Nano Banana Pro, extracts base64 image, returns Buffer.

**Storage:**
- `storage.ts` — In-memory implementation only. `Map<string, Comic>` for metadata, `Map<string, Buffer>` for images (serve via a simple API route or use data URIs).
- Alternatively, set up Vercel KV + Blob from the start if you want deployability immediately.

**Types and constants:**
- `types.ts` — Full type definitions (these don't change across epics).
- `constants.ts` — Full constants (these don't change across epics).

#### What is NOT in Epic 1
- No random idea generator ("Surprise Me").
- No follow-up questions (Step 2 of the full wizard).
- No script editing or regeneration.
- No generation mode selection (automated only).
- No supervised mode.
- No page regeneration or version selection.
- No library page.
- No sharing.
- No PDF export.

---

### Epic 2 — Creative Control

**Demo outcome:** A user can get a random idea, answer follow-up questions to personalize the story, edit or regenerate the script with feedback, choose between supervised and automated mode, regenerate pages up to 3 times, and pick their favorite version of each page.

This epic adds all the creative refinement features that make the user feel in control of their comic.

#### Frontend

**Wizard updates (`/create`) — now all 5 steps**

*Step 1 — Idea & Preferences (updated):*
- Add "Surprise Me" button that calls `GET /api/comic/random-idea` and fills the text area.

*Step 2 — Follow-Up Questions (new):*
- Display up to 5 questions returned from `POST /api/comic`.
- Text input for each question. All optional.
- "Skip All" and "Next" buttons, both call `POST /api/comic/[id]/refine`.

*Step 3 — Script Review (updated):*
- Add "Edit" button that makes the script editable inline. User modifies the text directly, then clicks "Approve".
- Add "Regenerate" button that reveals a text input for feedback. Submitting calls `POST /api/comic/[id]/script/regenerate`. The new script replaces the old one in the UI.
- Multiple rounds of edit/regenerate allowed before approving.
- "Approve" button now advances to Step 4 instead of immediately generating.

*Step 4 — Mode Selection (new):*
- Two cards: "Supervised" and "Automated" with short descriptions of each.
- Selecting one calls `PUT /api/comic/[id]/approve` and advances to Step 5.

*Step 5 — Generation (updated):*

Supervised mode:
- Calls `POST /api/comic/[id]/page/generate` for the current page. Shows loading state.
- Displays the generated page image.
- Version thumbnails: shows all generated versions as small thumbnails. Clicking one selects it.
- "Regenerate" button with counter ("2 of 3 remaining"). Calls `POST /api/comic/[id]/page/regenerate`. Disabled when limit reached.
- "Approve & Next" button. Calls `PUT /api/comic/[id]/page/select`, then triggers generation of the next page.
- After the last page is approved, redirects to `/comic/[id]`.

Automated mode: unchanged from Epic 1.

#### Backend

**New API routes:**
- `GET /api/comic/random-idea` — Generate a random comic premise via Gemini.
- `POST /api/comic/[id]/refine` — Store follow-up answers.
- `POST /api/comic/[id]/script/regenerate` — Regenerate script with feedback.
- `POST /api/comic/[id]/page/generate` — Generate a single page image.
- `POST /api/comic/[id]/page/regenerate` — Regenerate a page (enforce max 3 regen limit).
- `PUT /api/comic/[id]/page/select` — Select a page version.

**Updated API routes:**
- `POST /api/comic` — Now generates follow-up questions via Gemini and returns them.

**AI pipeline additions:**
- `prompts.ts` — Add: random idea prompt, follow-up question generation prompt, script regeneration prompt.

#### What is NOT in Epic 2
- No library page.
- No sharing.
- No PDF export.

---

### Epic 3 — Library, Sharing, and Export

**Demo outcome:** The full product. A user can browse all their previously created comics in a library, share any comic via a link that works for anyone without an account, and export comics as downloadable PDFs.

This epic adds everything that makes the product feel complete and shareable.

#### Frontend

**Landing page (`/`) — updated:**
- Add a "My Comics" button/link in the header or hero section that navigates to `/library`.
- If the user has comics in localStorage, show a small preview strip (last 3 comics) with a "View All" link to `/library`.

**Library page (`/library`) — new:**
- On mount, read comic IDs from localStorage, call `POST /api/comic/batch` to fetch summaries.
- Render a grid of comic cards: thumbnail, title, status badge, art style label, page count, relative date.
- Click a complete comic to open `/comic/[id]`.
- Click an in-progress comic to resume at `/create` (reload the comic state and jump to the appropriate wizard step).
- Delete button on each card: removes from localStorage with a confirmation dialog.
- Empty state with CTA to create first comic.
- Sort by most recent first.

**Comic Viewer (`/comic/[id]`) — updated:**
- Add "Share" button: copies the current URL to clipboard. Show a brief "Link copied!" toast/confirmation.
- Add "Export PDF" button: generates a PDF client-side using `jspdf` and triggers download.

**PDF export (client-side):**
- Load all page images (already displayed in the viewer).
- Create a PDF with one comic page per PDF page using `jspdf`.
- Filename: `{comic-title}.pdf`.

#### Backend

**New API routes:**
- `POST /api/comic/batch` — Fetch multiple comics by ID array. Return lightweight summaries (id, status, title, artStyle, pageCount, thumbnailUrl, createdAt). Max 50 IDs.

**Updated routes:**
- `GET /api/comic/[id]` — No changes needed, but verify it works well as the share link data source (no auth gating, returns full comic for any valid ID).

**Storage (if not already done):**
- Implement the Vercel KV + Blob storage adapter for production deployment.
- Ensure all images have public Blob URLs so shared comic viewers can load them.

**Optional server-side PDF route:**
- `GET /api/comic/[id]/export/pdf` — If client-side PDF generation has quality issues, implement server-side as a fallback using `pdf-lib`. This is optional since client-side should work fine for the hackathon.

#### What this epic completes
- Library page with full comic history.
- Share via public link (zero-friction, no login for viewers).
- PDF export.
- Production-ready storage (Vercel KV + Blob).
- The product is now feature-complete per the product PRD.

---

### Epic Summary

| Epic | Working Product State | Key Features Added |
|------|----------------------|-------------------|
| 1 — Core Loop | User enters idea → gets script → gets finished comic | Landing page, basic wizard (idea + script review), automated generation, comic viewer |
| 2 — Creative Control | User can refine every aspect of their comic | Random ideas, follow-up questions, script edit/regenerate, supervised mode, page regeneration, version selection |
| 3 — Library & Sharing | Full product, shareable and exportable | Library page, share via link, PDF export, production storage |
