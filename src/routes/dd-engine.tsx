import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchOpportunitiesWithDDStatus, updateOpportunity, deleteOpportunity } from "@/lib/founders-data";
import { fetchAllFrameworkRounds, fetchDueDiligenceToolkitId } from "@/lib/dd-framework-admin";
import { fetchContacts } from "@/lib/contacts";
import { createOpportunityFromContact } from "@/lib/contacts.functions";
import { useServerFn } from "@tanstack/react-start";
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
import { Plus, Archive, ArchiveRestore, Trash2, User, FileText, CheckCircle2, XCircle, Search } from "lucide-react";
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
  const ddToolkitId = useQuery({ queryKey: ["dd-toolkit-id"], queryFn: fetchDueDiligenceToolkitId });
  const rounds = useQuery({
    queryKey: ["dd-framework-rounds", ddToolkitId.data],
    queryFn: () => fetchAllFrameworkRounds(ddToolkitId.data),
    enabled: ddToolkitId.isSuccess,
  });
  const totalRounds = rounds.data?.length ? Math.max(...rounds.data.map((r) => r.round)) : 5;
  const navigate = useNavigate();
  const [view, setView] = useState<"active" | "approved" | "rejected" | "archived">("active");
  const [displayMode, setDisplayMode] = useViewMode("dd-engine");
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

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
      if (view === "archived") { if (!opp.archived) return false; }
      else {
        if (opp.archived) return false;
        const s = opp.pipeline_status ?? "active";
        if (s !== view) return false;
      }
      if (!term) return true;
      const fields: (string | null | undefined)[] = [
        opp.dd_company_name, opp.name, opp.founder?.name, opp.industry, opp.sector,
        opp.current_stage, opp.pipeline_status,
        ...((opp.dd_key_contacts ?? []) as any[]).map((c) => c?.name),
      ];
      return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(term));
    });
  }, [all, view, term]);


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
      toast.success(vars.archived ? "Deal archived" : "Deal restored");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update deal"),
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
      toast.success("Deal deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete deal"),
  });

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Due Diligence"
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

      <div className="flex items-center gap-3 mt-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals by company, contact, sector or stage…"
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {opportunities.length} {opportunities.length === 1 ? "deal" : "deals"}
        </div>
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
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleBegin(opp.id, currentRound ?? undefined); }}
                  title="Enter the Rounds Room"
                  className="font-serif text-sm truncate min-w-0 flex-1 text-left text-primary hover:underline"
                >
                  {opp.dd_company_name ?? opp.name}
                </button>
                <div className="text-[11px] text-muted-foreground truncate hidden sm:block flex-1">
                  {opp.founder?.name && opp.founder.name !== opp.dd_company_name ? opp.founder.name : ""}
                </div>
                {(opp.dd_key_contacts ?? []).length > 0 && (
                  <div className="hidden md:flex items-center gap-1 flex-wrap shrink-0 max-w-[280px]">
                    {opp.dd_key_contacts.slice(0, 3).map((c: any) => (
                      <Badge key={c.id} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{c.name}</Badge>
                    ))}
                    {opp.dd_key_contacts.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">+{opp.dd_key_contacts.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium shrink-0 ${currentRound ? ROUND_COLORS[currentRound] : "bg-muted text-muted-foreground border-border"}`}>
                {currentRound ? `Round ${currentRound}/${totalRounds}` : "Not started"}
              </Badge>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => handleViewSynopsis(opp)}>
                  <FileText className="h-3 w-3 mr-1" /> View Synopsis
                </Button>
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
                  title={opp.archived ? "Restore deal" : "Archive deal"}
                  onClick={() => archiveMut.mutate({ id: opp.id, archived: !opp.archived })}
                >
                  {opp.archived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Delete deal">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes "{opp.dd_company_name ?? opp.name}" and its due diligence progress. This can't be undone — consider archiving instead if you might need it again.
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
              {view === "archived" ? "No archived deals" :
               view === "approved" ? "No approved deals yet" :
               view === "rejected" ? "No rejected deals" :
               "No deals yet"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {view === "active" ? "Add a deal to start the due diligence framework." : "They will show up here when marked."}
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
  const [contactId, setContactId] = useState<string>("");
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => fetchContacts(), enabled: open });
  const createOppFromContact = useServerFn(createOpportunityFromContact);

  // Company-first options, sorted by company then contact name, so the picker reads as a
  // company list (the deal is with a business, the contact is just who we speak to).
  const options = useMemo(() => {
    const rows = ((contacts.data ?? []) as any[]).map((c) => ({
      id: c.id,
      label: c.company ? `${c.company} · ${c.name}` : c.name,
      sortKey: `${(c.company ?? "\uffff").toLowerCase()}|${(c.name ?? "").toLowerCase()}`,
    }));
    return rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [contacts.data]);

  const createMut = useMutation({
    mutationFn: () => createOppFromContact({ data: { contactId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Deal added");
      setOpen(false);
      setContactId("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add deal"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add Deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New Deal</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company</Label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Choose a company…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !contactId}>
            {createMut.isPending ? "Adding…" : "Add Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

