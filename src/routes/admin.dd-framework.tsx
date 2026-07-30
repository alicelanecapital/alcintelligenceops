import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchDueDiligenceToolkitId } from "@/lib/dd-framework-admin";
import { PlaybookDesigner } from "@/components/PlaybookDesigner";

export const Route = createFileRoute("/admin/dd-framework")({ component: () => <AppShell><DDFrameworkAdmin /></AppShell> });

function DDFrameworkAdmin() {
  const toolkitId = useQuery({ queryKey: ["dd-toolkit-id"], queryFn: fetchDueDiligenceToolkitId });

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Due Diligence"
        description="Adjust the questions, guidance, and required documents for each due diligence round."
      />

      {toolkitId.isLoading ? (
        <p className="text-sm text-muted-foreground py-10">Loading…</p>
      ) : !toolkitId.data ? (
        <p className="text-sm text-muted-foreground py-10">No Due Diligence toolkit found.</p>
      ) : (
        <PlaybookDesigner toolkitId={toolkitId.data} stripDueDiligenceWording />
      )}
    </div>
  );
}
