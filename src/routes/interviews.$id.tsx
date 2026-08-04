import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LiveWorkspace } from "@/components/LiveWorkspace";

export const Route = createFileRoute("/interviews/$id")({
  head: () => ({
    meta: [
      { title: "Live Workspace · Meeting Intelligence" },
      { name: "description", content: "Run a live meeting with playbook questions, AI grading, transcript and DocBox in one workspace." },
      { property: "og:title", content: "Live Workspace · Meeting Intelligence" },
      { property: "og:description", content: "Playbook questions, AI grading, transcript and documents in one live meeting workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <AppShell><LiveWorkspace id={id} context="meeting" /></AppShell>;
}
