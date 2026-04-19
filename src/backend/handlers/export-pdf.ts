import { PDFDocument } from "pdf-lib";
import { getComic } from "@/backend/lib/db";

interface ExportPdfResult {
  pdf: Buffer;
  filename: string;
}

export async function exportPdf(id: string): Promise<ExportPdfResult> {
  const comic = await getComic(id);
  if (!comic) throw new Error("NOT_FOUND: Comic not found");
  if (comic.status !== "complete") {
    throw new Error("STATUS_ERROR: Comic is not complete");
  }

  const pdfDoc = await PDFDocument.create();

  for (const page of comic.pages) {
    const version = page.versions[page.selectedVersionIndex];
    if (!version) continue;

    const res = await fetch(version.imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image for page ${page.pageNumber}`);
    const imageBytes = await res.arrayBuffer();

    let pdfImage;
    const url = version.imageUrl.toLowerCase();
    if (url.includes(".jpg") || url.includes(".jpeg")) {
      pdfImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      pdfImage = await pdfDoc.embedPng(imageBytes);
    }

    const pdfPage = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
    pdfPage.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: pdfImage.width,
      height: pdfImage.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${comic.script?.title ?? "comic"}.pdf`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-");

  return { pdf: Buffer.from(pdfBytes), filename };
}
