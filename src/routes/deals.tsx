import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchDeals, updateDealStage, DEAL_STAGES } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { updateOpportunity, deleteOpportunity } from "@/lib/founders-data";
import { Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/deals")({ component: () => <AppShell><Deals /></AppShell> });

function Deals() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["deals"], queryFn: fetchDeals });
  const deals = q.data ?? [];
  const [draggedItem, setDraggedItem] = useState<any | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOpportunity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  async function move(id: string, stage: string) {
    try { await updateDealStage(id, stage); toast.success(`Moved to ${stage}`); qc.invalidateQueries({ queryKey: ["deals"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, deal: any) => {
    setDraggedItem(deal);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, stage: string) => {
    e.preventDefault();
    if (draggedItem) {
      move(draggedItem.id, stage);
      setDraggedItem(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Pipeline"
        title="Deal Flow"
        description="An 11-stage kanban from initial screening through portfolio. Drag cards between columns or use the stage selector."
      />
      <div className="overflow-x-auto -mx-8 px-8 pb-6">
        <div className="flex gap-4 min-w-max">
          {DEAL_STAGES.map((stage) => {
            const items = deals.filter((d: any) => d.stage === stage);
            return (
              <div
                key={stage}
                className="w-72 shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{stage}</div>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="space-y-1.5 min-h-[80px] bg-muted/40 rounded-lg p-1.5">
                  {items.map((d: any) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, d)}
                      className={`bg-card rounded-md px-2 py-1.5 border border-border shadow-sm cursor-move hover:shadow-md transition-shadow ${draggedItem?.id === d.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex justify-between items-center gap-1">
                        <div className="font-medium text-xs flex-1 truncate">{d.title}</div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button size="icon" variant="ghost" className="h-5 w-5">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => deleteMut.mutate(d.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="text-[10px] text-muted-foreground truncate flex-1">{d.organisation?.industry || d.organisation?.category || "—"}{d.source ? ` · ${d.source}` : ""}</div>
                        <select value={d.stage} onChange={(e) => move(d.id, e.target.value)} className="text-[10px] bg-background border border-border rounded px-1 py-0 h-5 shrink-0 max-w-[90px]">
                          {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
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
