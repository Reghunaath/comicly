import { NextRequest, NextResponse } from "next/server";
import { createComic } from "@/backend/handlers/create-comic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createComic(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.startsWith("INVALID_INPUT:")) {
        return NextResponse.json(
          { error: err.message.replace("INVALID_INPUT: ", "") },
          { status: 400 }
        );
      }
      if (err.message === "AUTH_REQUIRED") {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
