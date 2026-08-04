import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { resolveDealWorkspace } from "@/lib/deal-workspace.functions";

export const Route = createFileRoute("/dd-interview/$opportunityId/$round")({
  component: () => <AppShell><DealWorkspaceEntry /></AppShell>,
});

/** The Deal Pipeline Room IS the Live Workspace: this route resolves (or creates) the
 * deal's workspace meeting — driven by the DD Intelligence Engine playbook, whose rounds
 * are the workspace steps — and hands over to /interviews/$id so both screens are
 * literally the same UI. Existing /dd-interview/... links and bookmarks keep working. */
function DealWorkspaceEntry() {
  const { opportunityId } = useParams({ from: "/dd-interview/$opportunityId/$round" });
  const navigate = useNavigate();
  const resolve = useServerFn(resolveDealWorkspace);

  const workspace = useQuery({
    queryKey: ["deal-workspace", opportunityId],
    queryFn: () => resolve({ data: { dealId: opportunityId } }),
    staleTime: 60_000,
  });

  const interviewId = (workspace.data as any)?.id as string | undefined;
  useEffect(() => {
    if (interviewId) navigate({ to: "/interviews/$id", params: { id: interviewId }, replace: true });
  }, [interviewId, navigate]);

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-16 text-sm text-muted-foreground">
      {workspace.isError
        ? ((workspace.error as any)?.message ?? "Couldn't open this deal's workspace.")
        : "Opening the Live Workspace…"}
    </div>
  );
}
