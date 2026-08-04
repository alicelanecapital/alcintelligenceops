import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DDInterviewEnhanced } from "@/components/DDInterviewEnhanced";
// OpportunityOverviewBar intentionally not imported: the synopsis (Sector / Stakeholder
// Brief / AI Overview / DISC / Red Flags) is shown from the Deal Pipeline click-through
// dialog, not above every round.
import { RoundStepper } from "@/components/RoundStepper";
import { fetchAllFrameworkRounds, fetchDueDiligenceToolkitId } from "@/lib/dd-framework-admin";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
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
  const ddToolkitId = useQuery({ queryKey: ["dd-toolkit-id"], queryFn: fetchDueDiligenceToolkitId });
  const frameworkRounds = useQuery({
    queryKey: ["dd-framework-rounds", ddToolkitId.data],
    queryFn: () => fetchAllFrameworkRounds(ddToolkitId.data),
    enabled: ddToolkitId.isSuccess,
  });
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
    <div className="min-h-screen">
      {/* Sticky header -- same convention as the generic Live Workspace (interviews/$id):
          back arrow, uppercase eyebrow, serif title, badges on the right. */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate({ to: "/dd-engine" })} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live Workspace</div>
              <div className="font-serif text-2xl truncate">
                {companyName}
                {founderName && founderName !== companyName && <><span className="text-muted-foreground"> · </span><span className="text-foreground/70">{founderName}</span></>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            {sector && <Badge variant="outline" className="uppercase tracking-widest text-[10px]">{sector}</Badge>}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-6">
        {opp.data && null}

        {/* Horizontal stepper — no outer frame, individual round cards carry a hairline border. */}
        <div className="mb-6">
          <RoundStepper
            rounds={(frameworkRounds.data ?? [1, 2, 3, 4, 5].map((r) => ({ round: r, title: `Round ${r}`, subtitle: null }))).map((r: any) => ({ round: r.round, title: (r.title ?? '').replace(/Due Diligence/gi, 'DD'), subtitle: (r.subtitle ?? null)?.replace?.(/Due Diligence/gi, 'DD') ?? r.subtitle }))}
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
    </div>
  );
}
