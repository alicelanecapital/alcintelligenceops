import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, EyeOff } from "lucide-react";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getInterview, getReport } from "@/lib/interviews";
import { fetchTemplateDetail } from "@/lib/report-templates";
import { BoardReportDocument } from "@/components/BoardReportDocument";
import { exportBoardReportPdf } from "@/lib/board-report-pdf";

export const Route = createFileRoute("/interviews_/$id/board-report")({
  component: () => <AppShell><BoardReportPage /></AppShell>,
  validateSearch: (s: Record<string, unknown>) => ({ template: typeof s.template === "string" ? s.template : "" }),
});

function BoardReportPage() {
  const { id } = Route.useParams();
  const { template: templateId } = Route.useSearch();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [redactScores, setRedactScores] = useState(false);

  const interview = useQuery({ queryKey: ["iv", id], queryFn: () => getInterview(id) });
  const report = useQuery({ queryKey: ["iv-report", id], queryFn: () => getReport(id) });
  const templateDetail = useQuery({ queryKey: ["report-template", templateId], queryFn: () => fetchTemplateDetail(templateId), enabled: !!templateId });

  const isLoading = interview.isLoading || report.isLoading || templateDetail.isLoading;

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      const base = interview.data?.business_name || interview.data?.founder_name || "board-report";
      await exportBoardReportPdf(contentRef.current, `${String(base).replace(/[^a-z0-9]+/gi, "-")}-board-report.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to export PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/interviews/$id", params: { id } })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="min-w-0">
            <div className="font-serif text-xl truncate">Board Report — {interview.data?.business_name ?? interview.data?.founder_name ?? "…"}</div>
            {templateDetail.data && <div className="text-xs text-muted-foreground truncate">{templateDetail.data.template.name}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setRedactScores((v) => !v)}>
            {redactScores ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
            {redactScores ? "Scores Redacted" : "Redact Scores"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={downloading || isLoading}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {!templateId && <p className="text-sm text-muted-foreground">No template selected. Go back and choose one from the IC Report tab.</p>}
      {templateId && isLoading && <p className="text-sm text-muted-foreground">Assembling report…</p>}
      {templateId && !isLoading && !report.data && <p className="text-sm text-muted-foreground">No IC memo has been generated for this interview yet.</p>}
      {!isLoading && report.data && templateDetail.data && (
        <div className="overflow-x-auto">
          <div className="inline-block shadow-lg">
            <BoardReportDocument
              ref={contentRef}
              template={templateDetail.data.template}
              sections={templateDetail.data.sections}
              report={report.data.body}
              meta={{
                founderName: interview.data?.founder_name ?? undefined,
                businessName: interview.data?.business_name ?? undefined,
                industry: interview.data?.industry ?? undefined,
              }}
              redactScores={redactScores}
            />
          </div>
        </div>
      )}
    </div>
  );
}
