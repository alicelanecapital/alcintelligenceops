import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SynopsisContent, type SynopsisData } from "@/components/SynopsisContent";

export const Route = createFileRoute("/opportunities/$id/synopsis")({
  component: () => <AppShell><SynopsisPage /></AppShell>,
});

function SynopsisPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [meta, setMeta] = useState<SynopsisData>({ isLoading: true });

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, jsPdfMod] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const jsPDF = (jsPdfMod as any).default ?? (jsPdfMod as any).jsPDF;
      const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 20;
      pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 40;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 20;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 40;
      }
      const base = meta.companyName ?? meta.founderName ?? "synopsis";
      pdf.save(`${base.toString().replace(/[^a-z0-9]+/gi, "-")}-synopsis.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to export PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/dd-engine" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to pipeline
          </Button>
          <div className="min-w-0">
            <div className="font-serif text-xl truncate">Synopsis — {meta.founderName ?? "Opportunity"}</div>
            {meta.companyName && <div className="text-xs text-muted-foreground truncate">{meta.companyName}</div>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={downloading || meta.isLoading}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> {downloading ? "Preparing…" : "Download PDF"}
        </Button>
      </div>

      <SynopsisContent ref={contentRef} opportunityId={id} onMeta={setMeta} />
    </div>
  );
}
