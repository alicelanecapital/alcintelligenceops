import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DDInterviewEnhanced } from "@/components/DDInterviewEnhanced";
import { OpportunityOverviewBar } from "@/components/OpportunityOverviewBar";
import { RoundStepper } from "@/components/RoundStepper";
import { fetchAllFrameworkRounds } from "@/lib/dd-framework-admin";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
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
  const frameworkRounds = useQuery({ queryKey: ["dd-framework-rounds"], queryFn: fetchAllFrameworkRounds });
  // Lifted from DDInterviewEnhanced so the fixed overview panel above can render them
  // alongside DISC/AI overview, instead of DDInterviewEnhanced rendering them inline.
  const [stakeholderBrief, setStakeholderBrief] = useState<any>(null);
  const [detectedSector, setDetectedSector] = useState<string | null>(null);
  const [detectedSectorConfidence, setDetectedSectorConfidence] = useState(0);

  const companyName = opp.data?.company?.name ?? opp.data?.founder?.startup_name ?? opp.data?.name;
  // Opportunities sourced from Contacts/Events (contact_id-based, no founder_id link) have no
  // separate founder record -- the opportunity's own name IS the person, so fall back to it.
  const founderName = opp.data?.founder?.name ?? opp.data?.name;
  const sector = opp.data?.company?.industry ?? opp.data?.founder?.sector ?? opp.data?.industry;
  const description = opp.data?.description;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: "/dd-engine" })}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to opportunities
      </Button>

      {opp.data && (
        <OpportunityOverviewBar
          companyName={companyName}
          founderName={founderName}
          sector={sector}
          description={description}
          discProfile={opp.data?.disc_profile ?? null}
          overview={opp.data?.ai_overview ?? null}
          detectedSector={detectedSector}
          detectedSectorConfidence={detectedSectorConfidence}
          stakeholderBrief={stakeholderBrief}
        />
      )}

      {/* Horizontal stepper sits below the fixed overview panel and above this round's own
          heading (rendered by DDInterviewEnhanced), rather than a left-rail sidebar. */}
      <div className="mb-6 rounded-lg border border-border bg-card p-2">
        <RoundStepper
          rounds={(frameworkRounds.data ?? [1, 2, 3, 4, 5].map((r) => ({ round: r, title: `Round ${r}`, subtitle: null }))).map((r: any) => ({ round: r.round, title: r.title, subtitle: r.subtitle }))}
          current={roundNumber}
          onSelect={(r) => navigate({ to: `/dd-interview/${opportunityId}/${r}` })}
          orientation="horizontal"
        />
      </div>

      <DDInterviewEnhanced
        opportunityId={opportunityId}
        round={roundNumber}
        onStakeholderBriefChange={setStakeholderBrief}
        onSectorChange={(s, c) => { setDetectedSector(s); setDetectedSectorConfidence(c); }}
      />
    </div>
  );
}
