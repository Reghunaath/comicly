import { NextResponse } from "next/server";
import { randomIdea } from "@/backend/handlers/random-idea";

export async function GET() {
  try {
    const result = await randomIdea();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[random-idea] handler failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
