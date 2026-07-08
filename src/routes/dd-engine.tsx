import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchOpportunitiesWithDDStatus, createOpportunity, updateOpportunity, deleteOpportunity } from "@/lib/founders-data";
import { fetchFounders } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dd-engine")({ component: () => <AppShell><DDEngine /></AppShell> });

const SECTOR_LABELS: Record<string, string> = {
  A: "Physical service",
  B: "Retail",
  C: "Food",
  D: "Software",
  E: "Manufacturing",
};

function DDEngine() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunitiesWithDDStatus });
  const navigate = useNavigate();
  const [view, setView] = useState<"active" | "archived">("active");

  const opportunities = useMemo(
    () => (q.data ?? []).filter((opp: any) => (view === "archived" ? !!opp.archived : !opp.archived)),
    [q.data, view],
  );
  const archivedCount = useMemo(() => (q.data ?? []).filter((opp: any) => opp.archived).length, [q.data]);

  const handleBegin = (oppId: string, resumeRound?: number) => {
    navigate({ to: `/dd-interview/${oppId}/${resumeRound ?? 1}` });
  };

  const archiveMut = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => updateOpportunity(id, { archived }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success(vars.archived ? "Opportunity archived" : "Opportunity restored");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update opportunity"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOpportunity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete opportunity"),
  });

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Diligence"
        title="Deal Pipeline"
        description="Founder interviews guided by the 5-round due diligence framework."
        actions={<AddOpportunity />}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as "active" | "archived")} className="mt-6">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

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
                  <div className="flex items-center gap-1 shrink-0">
                    {sector && (
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        {sector}{sectorConfidence ? ` — ${Math.round(sectorConfidence)}%` : ""}
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={opp.archived ? "Restore opportunity" : "Archive opportunity"}
                      onClick={() => archiveMut.mutate({ id: opp.id, archived: !opp.archived })}
                    >
                      {opp.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete opportunity">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes "{opp.founder?.name ?? opp.name}" and its due diligence progress. This can't be undone — consider archiving instead if you might need it again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(opp.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
            <div className="font-serif text-xl">{view === "archived" ? "No archived opportunities" : "No opportunities yet"}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {view === "archived" ? "Archived opportunities will show up here." : "Add an opportunity to start the due diligence framework."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddOpportunity() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [founderId, setFounderId] = useState<string>("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const founders = useQuery({ queryKey: ["founders"], queryFn: fetchFounders, enabled: open });

  const createMut = useMutation({
    mutationFn: () =>
      createOpportunity({
        name,
        founder_id: founderId || null,
        industry: industry || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity added");
      setOpen(false);
      setFounderId("");
      setName("");
      setIndustry("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add opportunity"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New opportunity</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Existing founder (optional)</Label>
            <select
              value={founderId}
              onChange={(e) => {
                setFounderId(e.target.value);
                const f = (founders.data ?? []).find((x: any) => x.id === e.target.value);
                if (f && !name) { setName(f.startup_name ?? f.name ?? ""); setIndustry(f.sector ?? ""); }
              }}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Start blank —</option>
              {(founders.data ?? []).map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} · {f.startup_name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Opportunity name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Acme Software" />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? "Adding…" : "Add opportunity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
