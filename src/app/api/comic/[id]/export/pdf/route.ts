import { NextRequest, NextResponse } from "next/server";
import { exportPdf } from "@/backend/handlers/export-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { pdf, filename } = await exportPdf(id);
    return new NextResponse(pdf.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
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
