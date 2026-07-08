import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchOpportunities } from "@/lib/founders-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Plus, Play } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/dd-engine")({ component: () => <AppShell><DDEngine /></AppShell> });

const STAGES = ["Opportunity", "Screening", "Assessment", "Diagnostic", "Diligence", "Decision", "Portfolio"];

function DDEngine() {
  const q = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunities });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [draggedOpp, setDraggedOpp] = useState<any | null>(null);

  const opportunities = useMemo(() => {
    const opps = q.data ?? [];
    return STAGES.reduce((acc, stage) => {
      acc[stage] = opps.filter(o => (o.current_stage ?? "Screening") === stage);
      return acc;
    }, {} as Record<string, any[]>);
  }, [q.data]);

  const handleDragStart = (e: React.DragEvent, opp: any) => {
    setDraggedOpp(opp);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    if (draggedOpp && draggedOpp.current_stage !== toStage) {
      // TODO: Update opportunity stage in database
      setDraggedOpp(null);
    }
  };

  const handleBeginWizard = (oppId: string) => {
    navigate({ to: `/dd-interview/${oppId}/1` });
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Diligence"
        title="DD Engine"
        description="Combined screening, assessment, diagnostic, and diligence pipeline in Kanban format."
        actions={<Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" /> Add Opportunity</Button>}
      />

      <div className="grid grid-cols-6 gap-4 mt-6">
        {STAGES.map(stage => (
          <div
            key={stage}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
            className="bg-muted/30 rounded-lg p-4 min-h-[600px] border-2 border-dashed border-border hover:border-primary/50"
          >
            <div className="font-semibold text-sm mb-4 flex items-center justify-between">
              {stage}
              <Badge variant="secondary">{opportunities[stage]?.length ?? 0}</Badge>
            </div>
            <div className="space-y-3">
              {(opportunities[stage] ?? []).map(opp => (
                <Card
                  key={opp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp)}
                  className="cursor-move hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-sm">{opp.name}</div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-5 w-5">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {opp.founder && <div className="text-xs text-muted-foreground">{opp.founder.name}</div>}
                    {opp.company && <div className="text-xs text-muted-foreground">{opp.company.name}</div>}
                    {opp.mess_classification && (
                      <Badge variant="outline" className="text-[10px] mt-2">
                        {opp.mess_classification}
                      </Badge>
                    )}
                    {opp.screening_outcome && <div className="text-[11px] text-muted-foreground mt-2">{opp.screening_outcome}</div>}
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleBeginWizard(opp.id)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {opp.workflow_status === "completed" || opp.current_workflow_step ? "Resume" : "Begin"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
