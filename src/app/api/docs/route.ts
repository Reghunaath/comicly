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
