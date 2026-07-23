import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { listToolkits } from "@/lib/toolkits";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench } from "lucide-react";

export const Route = createFileRoute("/admin/toolkits/$id")({
  component: () => <AppShell><ToolkitDesigner /></AppShell>,
  head: () => ({
    meta: [
      { title: "Toolkit designer · Alice Lane" },
      { name: "description", content: "Design the rounds, questions and required documents for this Alice Lane toolkit." },
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
        <ArrowLeft className="h-3.5 w-3.5" /> All toolkits
      </Link>
      <PageHeader
        eyebrow="Admin · Toolkit"
        title={toolkit?.name ?? "Toolkit"}
        description={toolkit?.description ?? "Design the rounds, questions and required documents for this playbook."}
      />

      <div className="mt-8 border border-border rounded-md p-8 text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <Wrench className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="font-serif text-lg">Designer coming online</div>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          The round / question / document designer is currently wired up for the DD Intelligence Engine. Support for custom toolkits will be added next -- ping the team when you're ready to define this playbook and we'll enable the designer for it.
        </p>
        <Link to="/admin/toolkits" className="inline-block mt-4">
          <Button variant="outline" size="sm">Back to toolkits</Button>
        </Link>
      </div>
    </div>
  );
}
