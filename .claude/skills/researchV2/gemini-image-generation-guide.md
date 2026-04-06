# Gemini API — Image Generation Integration Guide

> Researched: April 2026 | API Version: v1beta

---

## Overview

The Gemini API exposes Google's image generation models through a unified REST/SDK interface. It covers two distinct model families:

- **Gemini native image models** (`gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`) — multimodal models that can generate and edit images within a conversational context, supporting text+image input and text+image output in a single call.
- **Imagen 4 models** (`imagen-4-fast`, `imagen-4-standard`, `imagen-4-ultra`) — Google's dedicated image generation models accessed via the same API, optimized purely for image quality.

**Primary use cases:** text-to-image generation, image-to-image editing, multi-turn image refinement, product visualization, UI mockup generation, and diagram/technical illustration creation.

---

## How to Get an API Key

1. **Sign up / log in** at [https://aistudio.google.com](https://aistudio.google.com) using a Google account.
2. **Email verification** is handled automatically through Google account sign-in — no separate verification step.
3. **Generate the key**: In AI Studio, click **"Get API key"** in the left sidebar → **"Create API key"** → select or create a Google Cloud project → copy the key.
4. **Free tier restrictions**:
   - As of December 2025, the free tier has **zero image generation quota** (0 IPM). You must enable billing to generate images.
   - Text-only Gemini models retain a free tier (e.g., 1,500 RPD on Gemini 2.5 Flash).
   - To unlock image generation: in AI Studio → **Billing** → link a Google Cloud billing account.
5. **Secure storage** — store the key as an environment variable:

```bash
# .env (never commit this file)
GEMINI_API_KEY=your_api_key_here
```

Reference in code via `process.env.GEMINI_API_KEY` (Node.js) or `os.environ["GEMINI_API_KEY"]` (Python).

---

## Authentication

All requests authenticate via an API key passed as a header or query parameter.

**Header method (preferred):**
```
x-goog-api-key: <GEMINI_API_KEY>
```

**Query parameter method (REST fallback):**
```
?key=<GEMINI_API_KEY>
```

The SDK handles this automatically when you initialize the client with the key.

---

## Installation / Setup

### JavaScript / TypeScript

```bash
npm install @google/genai
```

```bash
# .env
GEMINI_API_KEY=your_api_key_here
```

### Python

```bash
pip install google-genai
```

### Other SDKs

| Language | Package |
|----------|---------|
| Go | `google.golang.org/genai` |
| Java | `com.google.genai` (Maven) |
| REST | Direct HTTP — no install needed |

---

## Quick Start

### Text-to-Image (TypeScript)

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generateImage(prompt: string): Promise<void> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image", // cheapest image model at $0.039/image
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageBuffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync("output.png", imageBuffer);
      console.log("Image saved to output.png");
    } else if (part.text) {
      console.log("Model response:", part.text);
    }
  }
}

generateImage("A photorealistic red panda coding on a laptop in a cozy cafe");
```

### Image-to-Image Editing (TypeScript)

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function editImage(imagePath: string, instruction: string): Promise<void> {
  const imageBase64 = fs.readFileSync(imagePath).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        parts: [
          { text: instruction },
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      fs.writeFileSync("edited.png", Buffer.from(part.inlineData.data, "base64"));
    }
  }
}

editImage("photo.png", "Make the background a sunset beach scene");
```

### Imagen 4 via REST

```typescript
async function generateWithImagen4(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4-fast:generateImages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        prompt: { text: prompt },
        generationConfig: { sampleCount: 1 },
      }),
    }
  );

  const data = await response.json();
  // Returns base64 image in data.generatedImages[0].image.imageBytes
  return data.generatedImages[0].image.imageBytes;
}
```

---

## Key Endpoints / Methods

### Base URL
```
https://generativelanguage.googleapis.com/v1beta
```

### Gemini Native Image Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/models/{model}:generateContent` | Text-to-image or image-to-image generation |
| `POST` | `/models/{model}:streamGenerateContent` | Streaming response variant |

**Available models:**
| Model ID | Tier | Cost/Image | Best For |
|----------|------|-----------|----------|
| `gemini-2.5-flash-image` | Paid | $0.039 | Budget, high-volume |
| `gemini-3.1-flash-image-preview` | Paid | $0.045–$0.151 (by resolution) | Balance of speed/quality |
| `gemini-3-pro-image-preview` | Paid | $0.134–$0.24 (by resolution) | Highest quality, complex scenes |

**Key request parameters:**

```typescript
config: {
  responseModalities: ["TEXT", "IMAGE"], // REQUIRED — must include "IMAGE"
  imageConfig: {
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2",
    imageSize: "512" | "1K" | "2K" | "4K",
  },
}
```

**Response shape:**
```typescript
{
  candidates: [{
    content: {
      parts: [
        { text: "Optional descriptive text" },
        {
          inlineData: {
            mimeType: "image/png",
            data: "<base64-encoded-image>"
          }
        }
      ]
    },
    finishReason: "STOP" | "SAFETY" | "OTHER",
    safetyRatings: [...]
  }],
  usageMetadata: {
    promptTokenCount: number,
    candidatesTokenCount: number,
    totalTokenCount: number
  }
}
```

### Imagen 4 Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/models/imagen-4-fast:generateImages` | Fast, cheapest ($0.02/image) |
| `POST` | `/models/imagen-4-standard:generateImages` | Balanced ($0.04/image) |
| `POST` | `/models/imagen-4-ultra:generateImages` | Highest quality ($0.06/image) |

---

## Rate Limits

Limits are tiered based on account spend:

| Tier | Requirement | IPM (Images/min) | Upgrade Path |
|------|-------------|-----------------|-------------|
| Free | No billing | **0** (blocked) | Enable billing |
| Tier 1 | Billing enabled | ~2–10 IPM | Automatic |
| Tier 2 | $100+ spend, 3 days | ~20 IPM | Automatic |
| Tier 3 | $1,000+ spend, 30 days | 100+ IPM | Auto or negotiate |

Check your active quotas at: **AI Studio → Settings → Quotas**

**Batch API** is available for all image models with higher throughput limits (24-hour turnaround, 50% cost savings on input tokens).

---

## Error Handling

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generateWithRetry(
  prompt: string,
  maxRetries = 3
): Promise<string | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: { responseModalities: ["TEXT", "IMAGE"] },
      });

      const candidate = response.candidates?.[0];

      // Check for blocked responses
      if (candidate?.finishReason === "SAFETY") {
        console.error("Blocked by safety filter (Layer 1 — prompt-adjustable)");
        return null;
      }
      if (candidate?.finishReason === "OTHER") {
        console.error("Blocked by policy (Layer 2 — cannot be bypassed, change prompt)");
        return null;
      }

      const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
      return imagePart?.inlineData?.data ?? null;

    } catch (error: any) {
      const status = error?.status ?? error?.code;

      if (status === 429) {
        // Rate limited — exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (status === 400) {
        console.error("Bad request — check responseModalities and model ID");
        throw error; // Don't retry
      }

      if (status === 403) {
        console.error("Forbidden — billing not enabled or API key invalid");
        throw error;
      }

      if (status === 500 || status === 503) {
        console.warn(`Server error (${status}). Retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts`);
}
```

### Common Error Reference

| HTTP Code | `finishReason` | Cause | Fix |
|-----------|---------------|-------|-----|
| `429` | — | Rate limit exceeded or billing not enabled | Enable billing; exponential backoff |
| `400` | — | Missing `responseModalities`, wrong model ID, or bad base64 | Check request structure |
| `403` | — | Invalid API key or billing account issue | Verify key and billing in AI Studio |
| `500/503` | — | Transient server error | Retry with backoff |
| `200` | `SAFETY` | Triggered configurable safety filter | Adjust prompt or set safety thresholds |
| `200` | `OTHER` | Copyright, famous person, or child safety block | Fundamentally change the prompt — no workaround |

---

## Tips & Gotchas

1. **`responseModalities` is required.** Omitting it or setting only `["TEXT"]` will return a successful 200 response with no image data and no error — it silently degrades to text-only output.

2. **Free tier generates zero images.** As of December 7, 2025, the free tier hard limit for image generation is 0 IPM. You must attach a billing account — there is no free quota for images.

3. **The "Ghost 429" bug.** After upgrading from free to paid billing, 429 errors can persist for up to several hours even after billing is confirmed. Google acknowledged this as a known issue (Feb 2026). Workaround: wait and retry; if it persists >24h, contact support.

4. **SynthID watermarks are non-removable.** All generated images have Google's SynthID watermark embedded in pixel data. It is invisible to the human eye but detectable by Google's tools. There is no API parameter to disable this.

5. **No transparent backgrounds.** All models produce images with white backgrounds. Transparency is not supported.

6. **Max 14 reference images** per image-to-image request.

7. **Thinking mode is always on.** Gemini image models run an internal reasoning pass before generating. This adds latency (~2 interim images generated internally) and costs thinking tokens — billed even if you don't request `includeThoughts: true`.

8. **`IMAGE_SAFETY` vs `OTHER` blocks are distinct.** `SAFETY` blocks can be relaxed via `safetySettings` in your request (set `threshold: "BLOCK_NONE"`). `OTHER` blocks are Google policy enforcement (copyright, real people, CSAM) and cannot be configured away — you must change the prompt.

9. **Imagen 4 and Gemini image models are separate products.** Imagen 4 uses a different endpoint format (`:generateImages`) and request schema than Gemini native models (`:generateContent`). Mix-and-match code will not work.

10. **Batch API for cost savings.** If latency is not critical, use the Batch API to get 50% off input token costs with a 24-hour turnaround SLA.

---

## Alternatives

| API | Free Tier | Pricing | Strengths | Weaknesses |
|-----|-----------|---------|-----------|------------|
| **OpenAI GPT Image 1.5 / DALL-E 3** | None (credits on signup) | $0.040/image (standard), $0.080/image (HD) | #1 quality benchmark (Elo 1,284); best for text-in-image; strong safety for enterprise | No self-hosting; strictest content policy |
| **Flux 2 Pro v1.1** (Black Forest Labs) | Free when self-hosted | $0.055/image (API), free (self-hosted) | #3 quality (Elo 1,265); best photorealism; multiple speed/quality variants | API requires partner access; no native HD option |
| **Stable Diffusion 3.5 Large** (Stability AI) | Free when self-hosted | $0.025/image (API), free (self-hosted) | Fully open-source; supports fine-tuning/LoRA; cheapest API option | Needs 24GB+ VRAM to self-host; lower quality than top commercial models |
| **Midjourney** | None | $10–$60/month subscription | Best artistic/painterly aesthetic; community-beloved style | No public REST API — Discord bot only; not suitable for programmatic integration |

**When to pick an alternative:**
- **OpenAI GPT Image 1.5** — choose this when output quality is paramount, you need reliable text rendering inside images, or you require enterprise-grade content safety guarantees.
- **Flux 2 Pro / Stable Diffusion** — choose these when you need self-hosted deployment (data privacy, no per-image costs), want to fine-tune on custom styles via LoRA, or need to avoid Google's content policies.
- **Midjourney** — not viable as a production API integration; only pick it if you are building a Discord-based workflow or need its distinctive artistic aesthetic for non-automated use.

---

## Sources

- [Gemini API: Image Generation (Official Docs)](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini API: Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API: Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Complete Gemini Image API Guide 2026 — LaoZhang AI Blog](https://blog.laozhang.ai/en/posts/gemini-image-api-guide-2026)
- [Gemini Image Generation Free Limits 2026 — LaoZhang AI Blog](https://blog.laozhang.ai/en/posts/gemini-image-generation-free-limit-2026)
- [AI Image Generation API Comparison 2026 — LaoZhang AI Blog](https://blog.laozhang.ai/en/posts/ai-image-generation-api-comparison-2026)
- [Complete Guide to AI Image Generation APIs 2026 — WaveSpeedAI](https://wavespeed.ai/blog/posts/complete-guide-ai-image-apis-2026/)
- [Fix Gemini Image Generation Errors: 429, Safety Filters — LaoZhang AI Blog](https://blog.laozhang.ai/en/posts/gemini-image-common-errors-fix)
- [Gemini API Error Troubleshooting — LaoZhang AI Blog](https://blog.laozhang.ai/en/posts/gemini-api-error-troubleshooting)
- [AI Image Pricing 2026: Google Gemini vs OpenAI — IntuitionLabs](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai)
