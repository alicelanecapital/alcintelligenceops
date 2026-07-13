import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { DDInterviewEnhanced } from "@/components/DDInterviewEnhanced";
import { DiscProfileCard } from "@/components/DiscProfileCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dd-interview/$opportunityId/$round")({
  component: () => <AppShell><DDInterviewPage /></AppShell>,
});

async function fetchOpportunityCompanyDetails(opportunityId: string) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, founder:founders(name, startup_name, sector), company:companies(name, industry)")
    .eq("id", opportunityId)
    .single();
  if (error) throw error;
  return data as any;
}

function DDInterviewPage() {
  const { opportunityId, round } = useParams({ from: "/dd-interview/$opportunityId/$round" });
  const navigate = useNavigate();
  const roundNumber = Math.min(Math.max(parseInt(round, 10) || 1, 1), 5);

  const opp = useQuery({
    queryKey: ["opportunity-company-details", opportunityId],
    queryFn: () => fetchOpportunityCompanyDetails(opportunityId),
  });

  const companyName = opp.data?.company?.name ?? opp.data?.founder?.startup_name ?? opp.data?.name;
  const founderName = opp.data?.founder?.name;
  const sector = opp.data?.company?.industry ?? opp.data?.founder?.sector ?? opp.data?.industry;
  const description = opp.data?.description;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/dd-engine" })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to opportunities
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={roundNumber <= 1}
            onClick={() => navigate({ to: `/dd-interview/${opportunityId}/${roundNumber - 1}` })}
            title="Previous round"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-24 text-center">Round {roundNumber} of 5</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={roundNumber >= 5}
            onClick={() => navigate({ to: `/dd-interview/${opportunityId}/${roundNumber + 1}` })}
            title="Next round"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {opp.data && (
        <div className="sticky top-0 z-10 mb-6 rounded-lg border border-border bg-card/95 backdrop-blur px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-serif text-xl leading-tight">{companyName}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {founderName ? `Founder: ${founderName}` : null}
              </div>
            </div>
            {sector && (
              <Badge variant="outline" className="whitespace-nowrap">{sector}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {description || "No company description yet — add one from the contact's record to show it here."}
          </p>
        </div>
      )}

      <DiscProfileCard opportunityId={opportunityId} initialProfile={opp.data?.disc_profile ?? null} />

      <DDInterviewEnhanced opportunityId={opportunityId} round={roundNumber} />
    </div>
  );
}
