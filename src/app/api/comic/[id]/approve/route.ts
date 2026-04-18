import { NextRequest, NextResponse } from "next/server";
import { approveComic } from "@/backend/handlers/approve-comic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await approveComic(id, body);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.startsWith("INVALID_INPUT:")) {
        return NextResponse.json({ error: err.message.replace("INVALID_INPUT: ", "") }, { status: 400 });
      }
      if (err.message.startsWith("STATUS_ERROR:")) {
        return NextResponse.json({ error: err.message.replace("STATUS_ERROR: ", "") }, { status: 400 });
      }
      if (err.message.startsWith("NOT_FOUND:")) {
        return NextResponse.json({ error: "Comic not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
