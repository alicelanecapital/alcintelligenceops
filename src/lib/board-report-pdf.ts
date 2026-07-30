import { PAGE_WIDTH, PAGE_HEIGHT } from "@/components/BoardReportDocument";

/** Captures each `.board-report-page` inside container individually and drops it onto its
 * own A4 PDF page -- reads like an actual printed deck rather than one long image sliced
 * at arbitrary points. */
export async function exportBoardReportPdf(container: HTMLElement, filename: string) {
  const [{ default: html2canvas }, jsPdfMod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const jsPDF = (jsPdfMod as any).default ?? (jsPdfMod as any).jsPDF;

  const pages = Array.from(container.querySelectorAll<HTMLElement>(".board-report-page"));
  if (!pages.length) throw new Error("Nothing to export");

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [PAGE_WIDTH, PAGE_HEIGHT] });

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    if (i > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], "portrait");
    pdf.addImage(imgData, "PNG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }

  pdf.save(filename);
}
