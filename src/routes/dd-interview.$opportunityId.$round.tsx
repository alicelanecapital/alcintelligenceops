import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DDInterviewEnhanced } from "@/components/DDInterviewEnhanced";
import { OpportunityOverviewBar } from "@/components/OpportunityOverviewBar";
import { RoundStepper } from "@/components/RoundStepper";
import { fetchAllFrameworkRounds, fetchRoundDocumentsForDisplay } from "@/lib/dd-framework-admin";
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
  // Shown to the interviewee as prep for their *next* meeting -- see fetchRoundDocumentsForDisplay.
  const nextRoundDocuments = useQuery({
    queryKey: ["dd-framework-next-round-documents", roundNumber],
    queryFn: () => fetchRoundDocumentsForDisplay(roundNumber),
  });
  const documents = nextRoundDocuments.data ?? [];
  const [verificationTracking, setVerificationTracking] = useState<Record<string, boolean>>({});
  // Lifted from DDInterviewEnhanced so the fixed overview panel above can render them
  // alongside DISC/AI overview, instead of DDInterviewEnhanced rendering them inline.
  const [stakeholderBrief, setStakeholderBrief] = useState<any>(null);
  const [detectedSector, setDetectedSector] = useState<string | null>(null);
  const [detectedSectorConfidence, setDetectedSectorConfidence] = useState(0);

  const companyName = opp.data?.company?.name ?? opp.data?.founder?.startup_name ?? opp.data?.name;
  const founderName = opp.data?.founder?.name;
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

      {/* The overview bar sits above this grid (rather than inside the main column) so "Round 1"
          at the top of the stepper lines up with this round's own heading in the main column,
          instead of with whatever height the overview bar happens to take up. */}
      <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
        <aside className="sticky top-4 shrink-0 space-y-4">
          <RoundStepper
            rounds={(frameworkRounds.data ?? [1, 2, 3, 4, 5].map((r) => ({ round: r, title: `Round ${r}`, subtitle: null }))).map((r: any) => ({ round: r.round, title: r.title, subtitle: r.subtitle }))}
            current={roundNumber}
            onSelect={(r) => navigate({ to: `/dd-interview/${opportunityId}/${r}` })}
          />

          {documents.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-3">📋 Related documents for the next round:</p>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-2 p-2 bg-muted/40 rounded">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!verificationTracking[doc.name]}
                      onChange={(e) => setVerificationTracking((prev) => ({ ...prev, [doc.name]: e.target.checked }))}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <DDInterviewEnhanced
            opportunityId={opportunityId}
            round={roundNumber}
            onStakeholderBriefChange={setStakeholderBrief}
            onSectorChange={(s, c) => { setDetectedSector(s); setDetectedSectorConfidence(c); }}
          />
        </div>
      </div>
    </div>
  );
}
