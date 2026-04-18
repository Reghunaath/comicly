import type { ArtStylePreset, ScriptPage } from "@/backend/lib/types";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION } from "@/backend/lib/constants";
import { ai } from "./gemini-client";
import { buildImagePrompt } from "./prompts";

const IMAGE_MODEL = "gemini-3-pro-image-preview";

export async function generatePageImage(
  page: ScriptPage,
  artStyle: ArtStylePreset,
  title: string,
  totalPages: number,
  customStylePrompt?: string
): Promise<Buffer> {
  const prompt = buildImagePrompt(page, artStyle, title, totalPages, customStylePrompt);

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: IMAGE_ASPECT_RATIO,
        imageSize: IMAGE_RESOLUTION,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("No image returned from Nano Banana Pro");
}
