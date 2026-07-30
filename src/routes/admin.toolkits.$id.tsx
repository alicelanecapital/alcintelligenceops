import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { listToolkits } from "@/lib/toolkits";
import { ArrowLeft } from "lucide-react";
import { PlaybookDesigner } from "@/components/PlaybookDesigner";

export const Route = createFileRoute("/admin/toolkits/$id")({
  component: () => <AppShell><ToolkitDesigner /></AppShell>,
  head: () => ({
    meta: [
      { title: "Playbook designer · Alice Lane" },
      { name: "description", content: "Design the rounds, questions and required documents for this Alice Lane playbook." },
    ],
  }),
});

function ToolkitDesigner() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits });
  const toolkit = (q.data ?? []).find((t) => t.id === id);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <Link to="/admin/toolkits" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> All playbooks
      </Link>
      <PageHeader
        eyebrow="Admin · Playbook"
        title={toolkit?.name ?? "Playbook"}
        description={toolkit?.description ?? "Design the rounds, questions and required documents for this playbook."}
      />

      <div className="mt-8">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground py-10">Loading…</p>
        ) : !toolkit ? (
          <p className="text-sm text-muted-foreground py-10">Playbook not found.</p>
        ) : (
          <PlaybookDesigner toolkitId={toolkit.id} />
        )}
      </div>
    </div>
  );
}
