import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DDInterviewEnhanced } from "@/components/DDInterviewEnhanced";
// OpportunityOverviewBar intentionally not imported: the synopsis (Sector / Stakeholder
// Brief / AI Overview / DISC / Red Flags) is shown from the Deal Pipeline click-through
// dialog, not above every round.
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

async function fetchCompletedRounds(opportunityId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("dd_interviews")
    .select("round, status")
    .eq("opportunity_id", opportunityId)
    .eq("status", "completed");
  if (error) throw error;
  return (data ?? []).map((r) => r.round);
}

function DDInterviewPage() {
  const { opportunityId, round } = useParams({ from: "/dd-interview/$opportunityId/$round" });
  const navigate = useNavigate();
  // Round count isn't fixed at 5 any more -- DD Framework Admin can add/remove rounds -- so
  // only clamp the floor here; DDInterviewEnhanced falls back gracefully if the round doesn't exist.
  const roundNumber = Math.max(parseInt(round, 10) || 1, 1);

  const opp = useQuery({
    queryKey: ["opportunity-company-details", opportunityId],
    queryFn: () => fetchOpportunityCompanyDetails(opportunityId),
  });
  const frameworkRounds = useQuery({ queryKey: ["dd-framework-rounds"], queryFn: fetchAllFrameworkRounds });
  const completedRounds = useQuery({
    queryKey: ["dd-interview-statuses", opportunityId],
    queryFn: () => fetchCompletedRounds(opportunityId),
  });
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
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Opportunities
      </Button>

      {/* The synopsis (Sector / Stakeholder Brief / AI Overview / DISC / Red Flags) lives
          in the pipeline-list click-through dialog now, not above every round. Keep the
          stakeholder-brief/sector state wired here so DDInterviewEnhanced can still surface
          fresh data back up, but don't render OpportunityOverviewBar. */}
      {opp.data && null}

      {/* Horizontal stepper sits below the fixed overview panel and above this round's own
          heading (rendered by DDInterviewEnhanced), rather than a left-rail sidebar. */}
      <div className="mb-6 rounded-lg border border-border bg-card p-2">
        <RoundStepper
          rounds={(frameworkRounds.data ?? [1, 2, 3, 4, 5].map((r) => ({ round: r, title: `Round ${r}`, subtitle: null }))).map((r: any) => ({ round: r.round, title: r.title, subtitle: r.subtitle }))}
          current={roundNumber}
          onSelect={(r) => navigate({ to: `/dd-interview/${opportunityId}/${r}` })}
          orientation="horizontal"
          completedRounds={completedRounds.data}
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
