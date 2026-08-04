import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { LiveWorkspace } from "@/components/LiveWorkspace";
import { resolveDealWorkspace } from "@/lib/deal-workspace.functions";

export const Route = createFileRoute("/dd-interview/$opportunityId/$round")({
  head: () => ({
    meta: [
      { title: "Deal Pipeline Room · Due Diligence" },
      { name: "description", content: "Run due diligence rounds for a deal with playbook questions, AI grading, transcript and documents." },
      { property: "og:title", content: "Deal Pipeline Room · Due Diligence" },
      { property: "og:description", content: "Due diligence rounds with AI grading, red-flag alerts and document tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><DealWorkspaceEntry /></AppShell>,
});

/** The Deal Pipeline Room IS the Live Workspace, but it stays inside Deal Pipeline: this
 * route resolves (or creates) the deal's workspace meeting — driven by the DD Intelligence
 * Engine playbook, whose rounds are the workspace steps — and renders the same workspace
 * in place, so a DD round never gets mistaken for a private meeting. */
function DealWorkspaceEntry() {
  const { opportunityId } = useParams({ from: "/dd-interview/$opportunityId/$round" });
  const resolve = useServerFn(resolveDealWorkspace);

  const workspace = useQuery({
    queryKey: ["deal-workspace", opportunityId],
    queryFn: () => resolve({ data: { dealId: opportunityId } }),
    staleTime: 60_000,
  });

  const interviewId = (workspace.data as any)?.id as string | undefined;

  if (interviewId) {
    return (
      <LiveWorkspace
        id={interviewId}
        context="deal"
        backTo="/dd-engine"
        backLabel="Back to Deal Pipeline"
      />
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-16 text-sm text-muted-foreground">
      {workspace.isError
        ? ((workspace.error as any)?.message ?? "Couldn't open this deal's workspace.")
        : "Opening the Deal Pipeline Room…"}
    </div>
  );
}
