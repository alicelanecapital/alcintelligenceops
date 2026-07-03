import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OpportunityProfile } from "./opportunities.index";

export const Route = createFileRoute("/opportunities/$id")({
  component: () => <AppShell><OpportunityProfile /></AppShell>,
});
