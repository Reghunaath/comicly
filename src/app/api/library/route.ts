import { NextResponse } from "next/server";
import { getLibrary } from "@/backend/handlers/get-library";

export async function GET() {
  try {
    const result = await getLibrary();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "AUTH_REQUIRED") {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
