import { NextRequest, NextResponse } from "next/server";
import { claimComic } from "@/backend/handlers/claim-comic";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await claimComic(id);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "AUTH_REQUIRED") {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (err.message.startsWith("NOT_FOUND:")) {
        return NextResponse.json({ error: "Comic not found" }, { status: 404 });
      }
      if (err.message.startsWith("FORBIDDEN:")) {
        return NextResponse.json({ error: "You do not own this comic" }, { status: 403 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
