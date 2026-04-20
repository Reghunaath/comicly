import { z } from "zod";
import { MIN_PAGES, MAX_PAGES } from "./constants";

export const ART_STYLE_VALUES = [
  "manga",
  "western_comic",
  "watercolor_storybook",
  "minimalist_flat",
  "vintage_newspaper",
  "custom",
] as const;

export const CreateComicSchema = z
  .object({
    prompt: z.string().min(1, "prompt must not be empty"),
    artStyle: z.enum(ART_STYLE_VALUES, {
      error: `artStyle must be one of: ${ART_STYLE_VALUES.join(", ")}`,
    }),
    customStylePrompt: z.string().optional().nullable(),
    pageCount: z
      .number({ error: "pageCount must be a number" })
      .int("pageCount must be an integer")
      .min(MIN_PAGES, `pageCount must be at least ${MIN_PAGES}`)
      .max(MAX_PAGES, `pageCount must be at most ${MAX_PAGES}`),
  })
  .refine(
    (d) =>
      d.artStyle !== "custom" ||
      (typeof d.customStylePrompt === "string" && d.customStylePrompt.trim() !== ""),
    { message: "customStylePrompt is required when artStyle is 'custom'", path: ["customStylePrompt"] }
  );

export const RefineComicSchema = z.object({
  answers: z.record(z.string(), z.string(), {
    error: "answers must be an object mapping question IDs to strings",
  }),
});

export const RegenerateScriptSchema = z.object({
  feedback: z
    .string({ error: "feedback must be a string" })
    .min(1, "feedback must not be empty")
    .max(2000, "feedback must be at most 2000 characters"),
});

export const ApproveComicSchema = z.object({
  script: z.record(z.string(), z.unknown()).refine((v) => v !== null && typeof v === "object", {
    message: "script must be an object",
  }),
  generationMode: z.enum(["supervised", "automated"], {
    error: "generationMode must be 'supervised' or 'automated'",
  }),
});

export const PageGenerateSchema = z.object({
  pageNumber: z
    .number({ error: "pageNumber must be a number" })
    .int("pageNumber must be an integer")
    .min(1, "pageNumber must be at least 1"),
});

export const PageRegenerateSchema = z.object({
  pageNumber: z
    .number({ error: "pageNumber must be a number" })
    .int("pageNumber must be an integer")
    .min(1, "pageNumber must be at least 1"),
  feedback: z.string().max(2000, "feedback must be at most 2000 characters").optional().nullable(),
});

export const PageSelectSchema = z.object({
  pageNumber: z
    .number({ error: "pageNumber must be a number" })
    .int("pageNumber must be an integer")
    .min(1, "pageNumber must be at least 1"),
  versionIndex: z
    .number({ error: "versionIndex must be a number" })
    .int("versionIndex must be an integer")
    .min(0, "versionIndex must be at least 0"),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.length > 0 ? issue.path.join(".") : "body";
    throw new Error(`INVALID_INPUT: ${field}: ${issue.message}`);
  }
  return result.data;
}
