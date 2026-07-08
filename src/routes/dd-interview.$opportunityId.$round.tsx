import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DDInterviewEnhanced } from "@/components/DDInterviewEnhanced";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/dd-interview/$opportunityId/$round")({
  component: () => <AppShell><DDInterviewPage /></AppShell>,
});

function DDInterviewPage() {
  const { opportunityId, round } = useParams({ from: "/dd-interview/$opportunityId/$round" });
  const navigate = useNavigate();
  const roundNumber = Math.min(Math.max(parseInt(round, 10) || 1, 1), 5);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate({ to: "/dd-engine" })}
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to opportunities
      </Button>
      <DDInterviewEnhanced opportunityId={opportunityId} round={roundNumber} />
    </div>
  );
}
