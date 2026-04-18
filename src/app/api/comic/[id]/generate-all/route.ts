import { NextRequest, NextResponse } from "next/server";
import { generateAll } from "@/backend/handlers/generate-all";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await generateAll(id);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.startsWith("NOT_FOUND:")) {
        return NextResponse.json({ error: "Comic not found" }, { status: 404 });
      }
      if (err.message.startsWith("STATUS_ERROR:")) {
        return NextResponse.json({ error: err.message.replace("STATUS_ERROR: ", "") }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
