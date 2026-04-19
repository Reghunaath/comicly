import { NextRequest, NextResponse } from "next/server";
import { getComic } from "@/backend/handlers/get-comic";
import { deleteComic } from "@/backend/handlers/delete-comic";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteComic(id);
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
