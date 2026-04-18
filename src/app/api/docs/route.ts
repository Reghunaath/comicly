import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.0",
  info: {
    title: "Comicly API",
    version: "1.0.0",
    description: "Backend API for the Comicly comic generation app",
  },
  servers: [{ url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000" }],
  paths: {
    "/api/comic": {
      post: {
        summary: "Create comic",
        description: "Creates a new comic and generates follow-up questions via Gemini",
        tags: ["Comic"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt", "artStyle", "pageCount"],
                properties: {
                  prompt: { type: "string", example: "A detective cat solves mysteries in a steampunk city" },
                  artStyle: {
                    type: "string",
                    enum: ["manga", "western_comic", "watercolor_storybook", "minimalist_flat", "vintage_newspaper", "custom"],
                    example: "manga",
                  },
                  customStylePrompt: { type: "string", nullable: true, example: null },
                  pageCount: { type: "integer", minimum: 1, maximum: 15, example: 5 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Comic created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    comicId: { type: "string", format: "uuid" },
                    followUpQuestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "q1" },
                          question: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/{id}": {
      get: {
        summary: "Get comic",
        description: "Returns the full comic object. No auth required.",
        tags: ["Comic"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Comic object", content: { "application/json": { schema: { type: "object", properties: { comic: { type: "object" } } } } } },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/{id}/refine": {
      post: {
        summary: "Submit follow-up answers",
        description: "Stores answers and transitions status to script_pending",
        tags: ["Comic"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["answers"],
                properties: {
                  answers: { type: "object", additionalProperties: { type: "string" }, example: { q1: "Inspector Whiskers", q3: "A stolen diamond" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Answers stored", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "400": { description: "Validation or status error" },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/{id}/script/generate": {
      post: {
        summary: "Generate script",
        description: "Generates full comic script via Gemini. Transitions status to script_draft.",
        tags: ["Script"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Script generated", content: { "application/json": { schema: { type: "object", properties: { script: { type: "object" } } } } } },
          "400": { description: "Status error" },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/{id}/approve": {
      put: {
        summary: "Approve script",
        description: "Validates and stores the approved script and generation mode. Transitions status to script_approved.",
        tags: ["Script"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["script", "generationMode"],
                properties: {
                  script: { type: "object" },
                  generationMode: { type: "string", enum: ["supervised", "automated"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Script approved", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "400": { description: "Validation or status error" },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/{id}/generate-all": {
      post: {
        summary: "Generate all pages (automated mode)",
        description: "Generates a character sheet then all page images sequentially. Transitions status to generating → complete. Long-running — maxDuration 300s.",
        tags: ["Generation"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "All pages generated", content: { "application/json": { schema: { type: "object", properties: { comic: { type: "object" } } } } } },
          "400": { description: "Status or mode error" },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/{id}/export/pdf": {
      get: {
        summary: "Export comic as PDF",
        description: "Generates and returns a downloadable PDF of the comic. One full-page image per comic page. Comic must have status 'complete'.",
        tags: ["Export"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "PDF file", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          "400": { description: "Comic is not complete" },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/comic/random-idea": {
      get: {
        summary: "Generate random idea",
        description: "Returns a random one-sentence comic premise from Gemini",
        tags: ["Comic"],
        responses: {
          "200": {
            description: "Random idea",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    idea: { type: "string", example: "A retired astronaut opens a bakery on Mars." },
                  },
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(spec);
}
