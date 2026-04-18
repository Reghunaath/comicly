import { NextRequest, NextResponse } from "next/server";
import { getComic } from "@/backend/handlers/get-comic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getComic(id);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
