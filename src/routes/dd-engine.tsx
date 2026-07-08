import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchOpportunitiesWithDDStatus } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Plus } from "lucide-react";

export const Route = createFileRoute("/dd-engine")({ component: () => <AppShell><DDEngine /></AppShell> });

const SECTOR_LABELS: Record<string, string> = {
  A: "Physical service",
  B: "Retail",
  C: "Food",
  D: "Software",
  E: "Manufacturing",
};

function DDEngine() {
  const q = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunitiesWithDDStatus });
  const navigate = useNavigate();

  const opportunities = q.data ?? [];

  const handleBegin = (oppId: string, resumeRound?: number) => {
    navigate({ to: `/dd-interview/${oppId}/${resumeRound ?? 1}` });
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Diligence"
        title="Due Diligence"
        description="Founder interviews guided by the 5-round due diligence framework."
        actions={<Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Add Opportunity</Button>}
      />

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {opportunities.map((opp: any) => {
          const currentRound = opp.dd_current_round ?? null;
          const sector = opp.dd_detected_sector ? SECTOR_LABELS[opp.dd_detected_sector] : null;
          const sectorConfidence = opp.dd_sector_confidence;

          return (
            <Card key={opp.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-serif text-lg leading-tight">{opp.founder?.name ?? opp.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {opp.company?.name ?? "—"} · {currentRound ? `Round ${currentRound} of 5` : "Not started"}
                    </div>
                  </div>
                  {sector && (
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                      {sector}{sectorConfidence ? ` — ${Math.round(sectorConfidence)}%` : ""}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleBegin(opp.id, currentRound ?? undefined)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {currentRound ? `Resume round ${currentRound}` : "Begin"}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {q.isSuccess && !opportunities.length && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center bg-card">
            <div className="font-serif text-xl">No opportunities yet</div>
            <p className="text-sm text-muted-foreground mt-2">Add an opportunity to start the due diligence framework.</p>
          </div>
        )}
      </div>
    </div>
  );
}
