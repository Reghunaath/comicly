import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.0",
  info: {
    title: "Comicly API",
    version: "1.0.0",
    description: "Backend API for the Comicly comic generation app",
  },
  servers: [{ url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase JWT. Get it from browser DevTools → Application → Local Storage → sb-<project>-auth-token → access_token",
      },
    },
  },
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
    "/api/comic/{id}/script/regenerate": {
      post: {
        summary: "Regenerate script with feedback",
        description: "Regenerates the script incorporating user feedback. Comic must be in script_draft status. Multiple rounds allowed.",
        tags: ["Script"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["feedback"],
                properties: {
                  feedback: { type: "string", maxLength: 2000, example: "Make the villain more sympathetic and add a plot twist in the middle" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Script regenerated", content: { "application/json": { schema: { type: "object", properties: { script: { type: "object" } } } } } },
          "400": { description: "Validation or status error" },
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
    "/api/library": {
      get: {
        summary: "Get user library",
        description: "Returns all comics belonging to the authenticated user, ordered by creation date descending. Requires authentication.",
        tags: ["Library"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User's comics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    comics: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          "401": { description: "Authentication required" },
    "/api/comic/{id}/page/generate": {
      post: {
        summary: "Generate page image",
        description: "Generates a single page image in supervised mode. Generates a character sheet on first call if not already created. Transitions status to 'generating'. Long-running — maxDuration 300s.",
        tags: ["Generation"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pageNumber"],
                properties: {
                  pageNumber: { type: "integer", minimum: 1, example: 1 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Page generated", content: { "application/json": { schema: { type: "object", properties: { page: { type: "object" } } } } } },
          "400": { description: "Validation or status error" },
          "404": { description: "Comic not found" },
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
    "/api/comic/{id}/page/regenerate": {
      post: {
        summary: "Regenerate page image",
        description: "Generates a new version of a page. Enforces max 3 regenerations (4 total versions). Auto-selects the new version. Optional feedback is appended as director's notes to the prompt. Long-running — maxDuration 300s.",
        tags: ["Generation"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pageNumber"],
                properties: {
                  pageNumber: { type: "integer", minimum: 1, example: 1 },
                  feedback: { type: "string", nullable: true, example: "Make the colours warmer and the character look more surprised" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Page regenerated", content: { "application/json": { schema: { type: "object", properties: { page: { type: "object" } } } } } },
          "400": { description: "Validation, status, or limit error" },
          "404": { description: "Comic not found" },
          "500": { description: "Internal server error" },
        },
      },
      delete: {
        summary: "Delete comic",
        description: "Deletes a comic and all its associated storage images. Requires authentication and ownership.",
        tags: ["Library"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Comic deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Authentication required" },
          "403": { description: "Not the comic owner" },
    },
    "/api/comic/{id}/page/select": {
      put: {
        summary: "Select page version",
        description: "Sets the selectedVersionIndex on a page. Transitions comic status to 'complete' if this is the last page.",
        tags: ["Generation"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pageNumber", "versionIndex"],
                properties: {
                  pageNumber: { type: "integer", minimum: 1, example: 1 },
                  versionIndex: { type: "integer", minimum: 0, example: 0 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Version selected", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, complete: { type: "boolean" } } } } } },
          "400": { description: "Validation or status error" },
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
