import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDeals, updateDealStage, DEAL_STAGES } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/deals")({ component: () => <AppShell><Deals /></AppShell> });

function Deals() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["deals"], queryFn: fetchDeals });
  const deals = q.data ?? [];

  async function move(id: string, stage: string) {
    try { await updateDealStage(id, stage); toast.success(`Moved to ${stage}`); qc.invalidateQueries({ queryKey: ["deals"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Pipeline"
        title="Deal Flow"
        description="An 11-stage kanban from initial screening through portfolio. Drag between columns or use the stage menu on each card."
      />
      <div className="overflow-x-auto -mx-8 px-8 pb-6">
        <div className="flex gap-4 min-w-max">
          {DEAL_STAGES.map((stage) => {
            const items = deals.filter((d: any) => d.stage === stage);
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{stage}</div>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px] bg-muted/40 rounded-lg p-2">
                  {items.map((d: any) => (
                    <div key={d.id} className="bg-card rounded-md p-3 border border-border shadow-sm">
                      <div className="font-medium text-sm">{d.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{d.organisation?.industry || d.organisation?.category || "—"}</div>
                      {d.source && <div className="text-[10px] text-muted-foreground mt-1">via {d.source}</div>}
                      <select value={d.stage} onChange={(e) => move(d.id, e.target.value)} className="mt-2 w-full text-[11px] bg-background border border-border rounded px-1 py-0.5">
                        {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
