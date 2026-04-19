import fs from "fs";
import path from "path";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION } from "@/backend/lib/constants";
import { ai } from "./gemini-client";

const IMAGE_MODEL = "gemini-3-pro-image-preview";
const LOG_FILE = path.join(process.cwd(), "nano-banana-requests.log");

function logRequest(
  prompt: string,
  refCount: number,
  success: boolean,
  durationMs: number,
  error?: string
): void {
  const entry = [
    `[${new Date().toISOString()}]`,
    `refs=${refCount}`,
    `success=${success}`,
    `duration=${durationMs}ms`,
    error ? `error=${error}` : "",
    `\n--- PROMPT ---\n${prompt}\n--- END ---\n`,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    fs.appendFileSync(LOG_FILE, entry + "\n");
  } catch {
    console.warn("[image-generator] Failed to write to log file");
  }
}

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

  const start = Date.now();
  let response;
  try {
    response = await ai.models.generateContent({
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
  } catch (err) {
    logRequest(prompt, referenceBuffers.length, false, Date.now() - start, String(err));
    throw err;
  }

  const duration = Date.now() - start;
  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of responseParts) {
    if ((part as { inlineData?: { data?: string } }).inlineData?.data) {
      logRequest(prompt, referenceBuffers.length, true, duration);
      return Buffer.from(
        (part as { inlineData: { data: string } }).inlineData.data,
        "base64"
      );
    }
  }

  logRequest(prompt, referenceBuffers.length, false, duration, "No image in response");
  throw new Error("No image returned from image generation model");
}

export async function generateCharacterSheet(prompt: string): Promise<Buffer> {
  return generatePageImage(prompt, []);
}
