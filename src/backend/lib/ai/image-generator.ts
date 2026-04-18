import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION } from "@/backend/lib/constants";
import { ai } from "./gemini-client";

const IMAGE_MODEL = "gemini-3-pro-image-preview";

function detectMimeType(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/png";
}

export async function generatePageImage(
  prompt: string,
  referenceBuffers: Buffer[] = []
): Promise<Buffer> {
  const parts: object[] = [
    ...referenceBuffers.map((buf) => ({
      inlineData: {
        data: buf.toString("base64"),
        mimeType: detectMimeType(buf),
      },
    })),
    { text: prompt },
  ];

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: IMAGE_ASPECT_RATIO,
        imageSize: IMAGE_RESOLUTION,
      },
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of responseParts) {
    if ((part as { inlineData?: { data?: string } }).inlineData?.data) {
      return Buffer.from(
        (part as { inlineData: { data: string } }).inlineData.data,
        "base64"
      );
    }
  }

  throw new Error("No image returned from Nano Banana Pro");
}

export async function generateCharacterSheet(prompt: string): Promise<Buffer> {
  return generatePageImage(prompt, []);
}
