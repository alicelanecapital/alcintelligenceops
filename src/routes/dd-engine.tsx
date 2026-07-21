import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchOpportunitiesWithDDStatus, createOpportunity, updateOpportunity, deleteOpportunity } from "@/lib/founders-data";
import { fetchFounders } from "@/lib/db";
// Card frames removed — Deal Pipeline now uses a single-row divider list.
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
import { Play, Plus, Archive, ArchiveRestore, Trash2, User, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";

export const Route = createFileRoute("/dd-engine")({ component: () => <AppShell><DDEngine /></AppShell> });

// Sector labels retained for internal use elsewhere; the badge itself no longer renders on
// the pipeline list (sector is surfaced via the synopsis dialog instead).
const SECTOR_LABELS: Record<string, string> = {
  A: "Physical service",
  B: "Retail",
  C: "Food",
  D: "Software",
  E: "Manufacturing",
  F: "Health & Wellness",
};

// Distinct colour per round so the pipeline is scannable at a glance across cards.
const ROUND_COLORS: Record<number, string> = {
  1: "bg-blue-100 text-blue-700 border-blue-200",
  2: "bg-purple-100 text-purple-700 border-purple-200",
  3: "bg-amber-100 text-amber-700 border-amber-200",
  4: "bg-teal-100 text-teal-700 border-teal-200",
  5: "bg-rose-100 text-rose-700 border-rose-200",
};

function DDEngine() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunitiesWithDDStatus });
  const navigate = useNavigate();
  const [view, setView] = useState<"active" | "approved" | "rejected" | "archived">("active");
  const [displayMode, setDisplayMode] = useViewMode("dd-engine");

  const all = q.data ?? [];
  const counts = useMemo(() => {
    const c = { active: 0, approved: 0, rejected: 0, archived: 0 };
    for (const o of all as any[]) {
      if (o.archived) { c.archived++; continue; }
      const s = o.pipeline_status ?? "active";
      if (s === "approved") c.approved++;
      else if (s === "rejected") c.rejected++;
      else c.active++;
    }
    return c;
  }, [all]);

  const opportunities = useMemo(() => {
    return (all as any[]).filter((opp) => {
      if (view === "archived") return !!opp.archived;
      if (opp.archived) return false;
      const s = opp.pipeline_status ?? "active";
      return s === view;
    });
  }, [all, view]);

  const handleBegin = (oppId: string, resumeRound?: number) => {
    navigate({ to: `/dd-interview/${oppId}/${resumeRound ?? 1}` });
  };
  const handleViewSynopsis = (opp: any) => {
    const contactId = opp?.contact_id ?? opp?.founder?.id ?? opp?.founder_id;
    if (contactId) {
      navigate({ to: "/contacts/$id", params: { id: contactId }, search: { tab: "overview" } });
    } else {
      navigate({ to: "/opportunities/$id/synopsis", params: { id: opp.id } });
    }
  };

  const archiveMut = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => updateOpportunity(id, { archived }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success(vars.archived ? "Opportunity archived" : "Opportunity restored");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update opportunity"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "approved" | "rejected" }) =>
      updateOpportunity(id, { pipeline_status: status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success(
        vars.status === "approved" ? "Deal approved" :
        vars.status === "rejected" ? "Deal rejected" : "Moved back to active",
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update status"),
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

      <div className="flex items-center justify-between mt-6">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({counts.archived})</TabsTrigger>
          </TabsList>
        </Tabs>
        <ViewToggle mode={displayMode} onChange={setDisplayMode} />
      </div>

      <div className="mt-6 border-t border-border">
        {opportunities.map((opp: any) => {
          const currentRound = opp.dd_current_round ?? null;
          const status = opp.pipeline_status ?? "active";
          const isFinal = status === "approved" || status === "rejected";

          return (
            <div
              key={opp.id}
              onClick={() => handleViewSynopsis(opp)}
              className="flex items-center gap-3 py-2 px-1 border-b border-border hover:bg-muted/30 cursor-pointer"
            >
              <div className="h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                {opp.dd_photo_url ? (
                  <img src={opp.dd_photo_url} alt={opp.founder?.name ?? opp.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <div className="font-serif text-sm truncate min-w-0 flex-1">{opp.founder?.name ?? opp.name}</div>
                <div className="text-[11px] text-muted-foreground truncate hidden sm:block flex-1">{opp.company?.name ?? "—"}</div>
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium shrink-0 ${currentRound ? ROUND_COLORS[currentRound] : "bg-muted text-muted-foreground border-border"}`}>
                {currentRound ? `Round ${currentRound}/5` : "Not started"}
              </Badge>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => handleViewSynopsis(opp)}>
                  <FileText className="h-3 w-3 mr-1" /> View Synopsis
                </Button>
                {!isFinal && (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => handleBegin(opp.id, currentRound ?? undefined)}>
                    <Play className="h-3 w-3 mr-1 text-green-800 fill-green-800" />
                    {currentRound ? "Resume" : "Begin"}
                  </Button>
                )}
                {!isFinal && (
                  <>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" title="Approve deal" onClick={() => statusMut.mutate({ id: opp.id, status: "approved" })}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Reject deal" onClick={() => statusMut.mutate({ id: opp.id, status: "rejected" })}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {isFinal && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => statusMut.mutate({ id: opp.id, status: "active" })}>
                    Reopen
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  title={opp.archived ? "Restore opportunity" : "Archive opportunity"}
                  onClick={() => archiveMut.mutate({ id: opp.id, archived: !opp.archived })}
                >
                  {opp.archived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Delete opportunity">
                      <Trash2 className="h-3 w-3" />
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
          );
        })}

        {q.isSuccess && !opportunities.length && (
          <div className="p-12 text-center">
            <div className="font-serif text-xl">
              {view === "archived" ? "No archived opportunities" :
               view === "approved" ? "No approved deals yet" :
               view === "rejected" ? "No rejected deals" :
               "No opportunities yet"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {view === "active" ? "Add an opportunity to start the due diligence framework." : "They will show up here when marked."}
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
