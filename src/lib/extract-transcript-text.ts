/**
 * Extracts plain text from a transcript file the user uploads instead of recording live.
 * Supports .txt/.md (read directly), .pdf (pdfjs-dist), and .doc/.docx (mammoth) --
 * all client-side, no server round trip needed.
 */
export async function extractTranscriptText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it: any) => it.str).join(" "));
    }
    return pages.join("\n\n").trim();
  }

  if (name.endsWith(".docx") || name.endsWith(".doc") || file.type.includes("wordprocessingml") || file.type === "application/msword") {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value.trim();
  }

  // .txt, .md, or anything else -- read as plain text.
  return (await file.text()).trim();
}
