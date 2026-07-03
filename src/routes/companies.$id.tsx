import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CompanyProfile } from "./companies.index";

export const Route = createFileRoute("/companies/$id")({
  component: () => <AppShell><CompanyProfile /></AppShell>,
});
