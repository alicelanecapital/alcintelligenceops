// Auto-detects a document's heading structure so a report template's sections can be
// regenerated from an uploaded sample file, instead of being typed in by hand.
//
// .docx: reliable -- Word's own Heading 1/2/3 styles survive the convertToHtml pass as
// literal <h1>/<h2>/<h3> tags, so we just read them off in document order.
// .pdf: no semantic heading tags exist, so this falls back to a font-size heuristic --
// cluster the distinct text sizes on the page, treat the most common size as body text,
// and anything meaningfully larger as a heading candidate (nesting by how much larger).
// This works well for documents styled with distinct heading sizes; oddly-formatted PDFs
// may need manual cleanup afterwards, which the caller's preview step allows for.

export type ExtractedHeading = { title: string; level: 1 | 2 | 3 };

export async function extractHeadingsFromAttachment(url: string, filename: string): Promise<ExtractedHeading[]> {
  const name = filename.toLowerCase();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the attachment (HTTP ${res.status})`);
  const buffer = await res.arrayBuffer();

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    return extractFromDocx(buffer);
  }
  if (name.endsWith(".pdf")) {
    return extractFromPdf(buffer);
  }
  throw new Error("Section auto-detection supports .docx and .pdf attachments only.");
}

async function extractFromDocx(buffer: ArrayBuffer): Promise<ExtractedHeading[]> {
  const mammoth: any = await import("mammoth/mammoth.browser");
  const convertToHtml = mammoth.convertToHtml ?? mammoth.default?.convertToHtml;
  const result = await convertToHtml({ arrayBuffer: buffer });
  const doc = new DOMParser().parseFromString(result.value, "text/html");
  const headings: ExtractedHeading[] = [];
  doc.body.querySelectorAll("h1, h2, h3").forEach((el) => {
    const title = el.textContent?.trim();
    if (!title) return;
    const level = Number(el.tagName[1]) as 1 | 2 | 3;
    headings.push({ title, level });
  });
  return headings;
}

async function extractFromPdf(buffer: ArrayBuffer): Promise<ExtractedHeading[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

  const docTask = pdfjs.getDocument({ data: buffer });
  const doc = await docTask.promise;

  const lines: { text: string; size: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const byY = new Map<string, { parts: string[]; size: number }>();
    for (const item of content.items as any[]) {
      const str = item.str as string | undefined;
      if (!str || !str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const size = Math.hypot(item.transform[2], item.transform[3]);
      const key = String(y);
      if (!byY.has(key)) byY.set(key, { parts: [], size: 0 });
      const entry = byY.get(key)!;
      entry.parts.push(str);
      entry.size = Math.max(entry.size, size);
    }
    for (const { parts, size } of byY.values()) {
      const text = parts.join(" ").trim();
      if (text) lines.push({ text, size });
    }
  }
  if (!lines.length) return [];

  const sizeCounts = new Map<number, number>();
  for (const l of lines) {
    const s = Math.round(l.size);
    sizeCounts.set(s, (sizeCounts.get(s) ?? 0) + 1);
  }
  const bodySize = [...sizeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const headingSizes = [...new Set(lines.map((l) => Math.round(l.size)))]
    .filter((s) => s > bodySize * 1.08)
    .sort((a, b) => b - a);
  if (!headingSizes.length) return [];

  const levelForSize = (size: number): 1 | 2 | 3 => {
    const idx = headingSizes.findIndex((s) => Math.round(size) >= s);
    return (Math.min(idx < 0 ? headingSizes.length - 1 : idx, 2) + 1) as 1 | 2 | 3;
  };

  const headings: ExtractedHeading[] = [];
  for (const l of lines) {
    const size = Math.round(l.size);
    if (size <= bodySize * 1.08) continue;
    if (l.text.length > 120) continue; // long lines at a "heading" size are usually a stray paragraph, not a title
    headings.push({ title: l.text, level: levelForSize(size) });
  }
  return headings;
}
