import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchContact, fetchContactMeetings, fetchContactOpportunities, deleteContact, uploadContactPhoto, updateContact, CATEGORY_LABELS } from "@/lib/contacts";
import { startMeetingForContact } from "@/lib/contacts.functions";
import { generateContactStakeholderBrief } from "@/lib/contact-brief.functions";
import { dismissInterview } from "@/lib/interviews";
import { EditContactDialog } from "@/components/EditContactDialog";
import { SmartLink } from "@/components/SmartLink";
import { contactColor } from "@/lib/contact-colors";
import { supabase } from "@/integrations/supabase/client";
import { SECTOR_MODULES } from "@/lib/dd-framework-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useRef, useState } from "react";
import { Mic, FileText, Mail, Phone, Globe, Linkedin as LinkedinIcon, Pencil, Trash2, Calendar, X, Building2, Camera, User, Sparkles, RefreshCw, Flag, BrainCircuit, Target, StickyNote, FolderOpen, History, CheckCircle2, PlaySquare } from "lucide-react";
import { NewMeetingDialog } from "@/components/NewMeetingDialog";
import { toast } from "sonner";
import { RequestInfoModal } from "@/components/RequestInfoModal";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contacts/$id")({
  component: () => <AppShell><ContactProfile /></AppShell>,
});

const DISC_DIMS = [
  { key: "dominance", letter: "D", label: "Dominance", color: "bg-red-500" },
  { key: "influence", letter: "I", label: "Influence", color: "bg-amber-500" },
  { key: "steadiness", letter: "S", label: "Steadiness", color: "bg-green-500" },
  { key: "conscientiousness", letter: "C", label: "Conscientiousness", color: "bg-blue-500" },
] as const;

function ContactProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["contact", id], queryFn: () => fetchContact(id) });
  const meetings = useQuery({ queryKey: ["contact-meetings", id], queryFn: () => fetchContactMeetings(id) });
  const opps = useQuery({ queryKey: ["contact-opps", id], queryFn: () => fetchContactOpportunities(id) });

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);

  const startMeeting = useServerFn(startMeetingForContact);
  const briefFn = useServerFn(generateContactStakeholderBrief);

  const meetMut = useMutation({
    mutationFn: () => startMeeting({ data: { contactId: id } }),
    onSuccess: (row: any) => {
      toast.success("Meeting started");
      navigate({ to: "/interviews/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const delMut = useMutation({
    mutationFn: () => deleteContact(id),
    onSuccess: () => {
      toast.success("Contact deleted");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      navigate({ to: "/contacts" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const briefMut = useMutation({
    mutationFn: (force: boolean) => briefFn({ data: { contactId: id, force } }),
    onSuccess: () => { toast.success("Brief updated"); qc.invalidateQueries({ queryKey: ["contact", id] }); },
    onError: (e: any) => toast.error(e.message ?? "Brief failed"),
  });

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const uploadPhotoMut = useMutation({
    mutationFn: (file: File) => uploadContactPhoto(id, file),
    onSuccess: () => {
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["contact", id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to upload photo"),
    onSettled: () => setUploadingPhoto(false),
  });

  if (q.isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="p-10 text-sm text-muted-foreground">Contact not found. <Link to="/contacts" className="text-primary">Back</Link></div>;

  const c: any = q.data;
  const cat = contactColor(c.category);

  const openOpps = (opps.data ?? []).filter((o: any) => ((o.pipeline_status ?? "active").toLowerCase()) !== "approved");
  const approvedOpps = (opps.data ?? []).filter((o: any) => ((o.pipeline_status ?? "").toLowerCase()) === "approved");
  const primaryOpp = openOpps[0] ?? approvedOpps[0] ?? (opps.data ?? [])[0];
  const liveMeeting = (meetings.data ?? []).find((m: any) => m.status === "live") ?? (meetings.data ?? [])[0];

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex items-start gap-4 mb-4">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          title="Upload profile photo"
          className="relative h-16 w-16 rounded-full overflow-hidden border border-border bg-muted shrink-0 group"
        >
          {c.photo_url ? (
            <img src={c.photo_url} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground"><User className="h-7 w-7" /></div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        <input
          ref={photoInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadingPhoto(true); uploadPhotoMut.mutate(f); } e.target.value = ""; }}
        />
      </div>
      <PageHeader
        eyebrow={<Link to="/contacts" className="hover:underline">← Contacts</Link>}
        title={c.company || c.name}
        description={c.company ? `${c.name}${c.position ? ` · ${c.position}` : ""}` : (c.position ?? "")}
        actions={
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" onClick={() => setMeetOpen(true)}>
              <Mic className="h-3.5 w-3.5 mr-1" /> Meet
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Request Info
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        }
      />

      {/* Compact fact row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-6 pb-4 border-b border-border">
        <Badge className={cn("border", cat.badge)}>{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
        {c.email && <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
        {c.phone && <span className="inline-flex items-center gap-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</span>}
        {c.linkedin && <a href={c.linkedin} target="_blank" className="inline-flex items-center gap-1 text-primary hover:underline"><LinkedinIcon className="h-3.5 w-3.5" />LinkedIn</a>}
        {c.website && <span className="inline-flex items-center gap-1 text-muted-foreground"><Globe className="h-3.5 w-3.5" /><SmartLink href={c.website} /></span>}
        {c.status && <Badge variant="outline" className="capitalize border-forest text-forest">{c.status}</Badge>}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><Sparkles className="h-3.5 w-3.5 mr-1" /> AI Overview</TabsTrigger>
          <TabsTrigger value="brief"><Sparkles className="h-3.5 w-3.5 mr-1" /> Stakeholder Brief</TabsTrigger>
          <TabsTrigger value="live"><PlaySquare className="h-3.5 w-3.5 mr-1" /> Live Workspace</TabsTrigger>
          <TabsTrigger value="docs"><FolderOpen className="h-3.5 w-3.5 mr-1" /> Documents</TabsTrigger>
          <TabsTrigger value="meetings"><History className="h-3.5 w-3.5 mr-1" /> Meeting History</TabsTrigger>
          <TabsTrigger value="deals"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approved Deals</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-3.5 w-3.5 mr-1" /> Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6 space-y-4">
          <OverviewTab
            contact={c}
            opportunity={primaryOpp}
            openOpps={openOpps}
            opportunities={opps.data ?? []}
          />
        </TabsContent>

        <TabsContent value="brief" className="pt-6">
          <StakeholderBriefTab
            contact={c}
            briefPending={briefMut.isPending}
            onGenerateBrief={(force) => briefMut.mutate(force)}
          />
        </TabsContent>

        <TabsContent value="live" className="pt-6">
          <LiveWorkspaceTab liveMeeting={liveMeeting} onStartMeeting={() => setMeetOpen(true)} />
        </TabsContent>

        <TabsContent value="docs" className="pt-6">
          <DocumentsTab opportunities={opps.data ?? []} />
        </TabsContent>

        <TabsContent value="meetings" className="pt-6">
          <MeetingHistoryTab contactId={id} meetings={meetings.data ?? []} />
        </TabsContent>

        <TabsContent value="deals" className="pt-6">
          <ApprovedDealsTab approvedOpps={approvedOpps} />
        </TabsContent>

        <TabsContent value="notes" className="pt-6">
          <NotesTab contactId={id} initial={c.notes ?? ""} />
        </TabsContent>
      </Tabs>

      <EditContactDialog open={editOpen} onClose={() => setEditOpen(false)} contact={c} />
      <RequestInfoModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        contactId={id}
        contactName={c.name}
        contactEmail={c.email}
        onOpportunityCreated={(opp: any) => {
          qc.invalidateQueries({ queryKey: ["contact-opps", id] });
          navigate({ to: "/dd-interview/$opportunityId/$round", params: { opportunityId: opp.id, round: "1" } });
        }}
      />
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => delMut.mutate()}
        name={c.company || c.name}
        pending={delMut.isPending}
      />
      <NewMeetingDialog
        open={meetOpen}
        onOpenChange={setMeetOpen}
        defaults={{
          contactId: c.id,
          founderName: c.name,
          businessName: c.company ?? undefined,
          industry: c.industry ?? undefined,
        }}
      />
    </div>
  );
}

/* ============ Overview tab ============ */

function OverviewTab({ contact: c, opportunity, openOpps, opportunities }: {
  contact: any; opportunity: any; openOpps: any[]; opportunities: any[];
}) {
  const detectedCode = opportunity?.dd_detected_sector;
  const detectedConf = opportunity?.dd_sector_confidence ?? 0;
  const sector = detectedCode && detectedConf >= 50 ? (SECTOR_MODULES as any)[detectedCode]?.name : null;
  const disc = opportunity?.disc_profile as any;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="sector">
            <AccordionTrigger className="text-sm">
              <span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-teal-700" /> Sector</span>
            </AccordionTrigger>
            <AccordionContent>
              {sector ? (
                <p className="text-sm">{sector}{detectedConf ? <span className="text-xs text-muted-foreground"> ({Math.round(detectedConf)}% confidence)</span> : null}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not detected yet — appears once a DD round has been recorded and analysed.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {c.company_description && (
            <AccordionItem value="company">
              <AccordionTrigger className="text-sm">
                <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" /> Company description</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm whitespace-pre-wrap text-foreground/80">{c.company_description}</p>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="disc">
            <AccordionTrigger className="text-sm">
              <span className="inline-flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-cyan-700" /> DISC Personality Profile</span>
            </AccordionTrigger>
            <AccordionContent>
              {disc ? (
                <div className="space-y-2">
                  {disc.primary_style && (
                    <div className="text-sm">
                      Primary: <span className="font-medium">{disc.primary_style}</span>
                      {disc.secondary_style ? ` · Secondary: ${disc.secondary_style}` : ""}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {DISC_DIMS.map(({ key, letter, label, color }) => {
                      const dim: any = disc[key];
                      if (!dim) return null;
                      return (
                        <div key={key} className="border border-border rounded-md p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{letter} — {label}</span>
                            <span className="text-[10px] text-muted-foreground">{dim.score}</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                            <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }} />
                          </div>
                          {dim.evidence && <p className="text-[11px] text-muted-foreground">{dim.evidence}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not enough information yet — completes as DD rounds are recorded.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="flags">
            <AccordionTrigger className="text-sm">
              <span className="inline-flex items-center gap-2"><Flag className="h-4 w-4 text-rose-600" /> Red Flags</span>
            </AccordionTrigger>
            <AccordionContent>
              <RedFlagsTab opportunities={opportunities} />
            </AccordionContent>
          </AccordionItem>

          {openOpps.length > 0 && (
            <AccordionItem value="opps">
              <AccordionTrigger className="text-sm">
                <span className="inline-flex items-center gap-2"><Target className="h-4 w-4" /> Opportunities in workflow ({openOpps.length})</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {openOpps.map((o: any) => (
                    <Link key={o.id} to="/dd-interview/$opportunityId/$round" params={{ opportunityId: o.id, round: "1" }} className="block">
                      <div className="border-b border-border py-3 hover:bg-muted/30 transition-colors flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{o.name}</div>
                          {o.summary && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{o.summary}</div>}
                        </div>
                        <Badge variant="outline">{o.current_stage}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      <aside className="space-y-6">
        {c.source_event && (
          <section>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Source event</div>
            <div className="text-sm font-medium">{c.source_event.name}</div>
            {c.source_event.city && <div className="text-xs text-muted-foreground">{c.source_event.city}{c.source_event.country ? `, ${c.source_event.country}` : ""}</div>}
            {c.source_event.start_date && <div className="text-xs text-muted-foreground">{new Date(c.source_event.start_date).toLocaleDateString()}</div>}
            {c.date_met && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Met {new Date(c.date_met).toLocaleDateString()}
              </div>
            )}
          </section>
        )}
        {c.ai_summary && (
          <section>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">AI summary</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.ai_summary}</p>
          </section>
        )}
        {c.tags && c.tags.length > 0 && (
          <section>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tags</div>
            <div className="flex flex-wrap gap-1">{c.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
          </section>
        )}
      </aside>
    </div>
  );
}

/* ============ Stakeholder Brief tab (auto-generates on first view) ============ */

function StakeholderBriefTab({ contact: c, briefPending, onGenerateBrief }: {
  contact: any; briefPending: boolean; onGenerateBrief: (force: boolean) => void;
}) {
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (triggeredRef.current) return;
    if (!c.stakeholder_brief && !briefPending) {
      triggeredRef.current = true;
      onGenerateBrief(false);
    }
  }, [c.stakeholder_brief, briefPending, onGenerateBrief]);

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-sky-900 inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Stakeholder Brief</div>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Regenerate" onClick={() => onGenerateBrief(true)} disabled={briefPending}>
          <RefreshCw className={cn("h-3.5 w-3.5", briefPending && "animate-spin")} />
        </Button>
      </div>
      {c.stakeholder_brief ? (
        <div className="space-y-2 text-sm text-sky-900">
          {c.stakeholder_brief.summary && <p>{c.stakeholder_brief.summary}</p>}
          {c.stakeholder_brief.talking_points?.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Talking points</div>
              <ul className="list-disc list-inside text-xs text-sky-800 space-y-0.5">
                {c.stakeholder_brief.talking_points.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {c.stakeholder_brief.watch_outs?.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Watch-outs</div>
              <ul className="list-disc list-inside text-xs text-sky-800 space-y-0.5">
                {c.stakeholder_brief.watch_outs.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-sky-700">{briefPending ? "Generating brief…" : "No brief yet — generating…"}</p>
      )}
    </section>
  );
}

/* ============ Live Workspace tab ============ */

function LiveWorkspaceTab({ liveMeeting, onStartMeeting }: { liveMeeting: any; onStartMeeting: () => void }) {
  if (!liveMeeting) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <PlaySquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">No live or recent meeting for this contact.</p>
        <Button onClick={onStartMeeting}><Mic className="h-4 w-4 mr-1" /> Start meeting</Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="text-sm font-medium">{liveMeeting.title ?? liveMeeting.meeting_type ?? "Meeting"}</div>
          <div className="text-xs text-muted-foreground">{new Date(liveMeeting.created_at).toLocaleString()} · {liveMeeting.status}</div>
        </div>
        <Link to="/interviews/$id" params={{ id: liveMeeting.id }}>
          <Button size="sm"><PlaySquare className="h-4 w-4 mr-1" /> Open workspace</Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        The full live workspace (interview guide, transcript, risk alerts, contradictions, missing evidence, document requests and manual assessment) opens in a dedicated screen so you have full width for recording.
      </p>
    </div>
  );
}

/* ============ Documents tab (grouped by round) ============ */

function DocumentsTab({ opportunities }: { opportunities: any[] }) {
  const oppIds = opportunities.map((o) => o.id);
  const q = useQuery({
    queryKey: ["contact-docs", oppIds.join(",")],
    enabled: oppIds.length > 0,
    queryFn: async () => {
      const { data: ivs, error: e1 } = await (supabase.from("dd_interviews") as any)
        .select("id, round, opportunity_id")
        .in("opportunity_id", oppIds);
      if (e1) throw e1;
      const ivIds = (ivs ?? []).map((i: any) => i.id);
      if (!ivIds.length) return [] as any[];
      const { data: docs, error: e2 } = await (supabase.from("dd_interview_documents") as any)
        .select("id, interview_id, round, document_category, file_url, file_name, uploaded_at")
        .in("interview_id", ivIds)
        .order("uploaded_at", { ascending: false });
      if (e2) throw e2;
      return docs ?? [];
    },
  });

  if (!oppIds.length) return <p className="text-sm text-muted-foreground">No opportunities yet — documents will appear here once the contact enters a DD round.</p>;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading documents…</p>;

  const rounds = [1, 2, 3, 4, 5];
  const byRound = new Map<number, any[]>();
  (q.data ?? []).forEach((d: any) => {
    const arr = byRound.get(d.round) ?? [];
    arr.push(d);
    byRound.set(d.round, arr);
  });

  return (
    <Accordion type="multiple" defaultValue={["r1"]} className="w-full">
      {rounds.map((r) => {
        const items = byRound.get(r) ?? [];
        return (
          <AccordionItem key={r} value={`r${r}`}>
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-forest text-white text-xs font-semibold">{r}</span>
                Round {r} <span className="text-xs text-muted-foreground">({items.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-8">No documents.</p>
              ) : (
                <ul className="pl-8 space-y-1">
                  {items.map((d: any) => (
                    <li key={d.id} className="text-sm flex items-center gap-2 border-b border-border/40 py-1.5 last:border-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      {d.file_url ? (
                        <a href={d.file_url} target="_blank" rel="noreferrer" className="hover:underline text-primary truncate">{d.file_name ?? d.document_category}</a>
                      ) : (
                        <span className="truncate">{d.file_name ?? d.document_category}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(d.uploaded_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/* ============ Meeting history tab ============ */

function MeetingHistoryTab({ contactId, meetings }: { contactId: string; meetings: any[] }) {
  const qc = useQueryClient();
  const dismissMut = useMutation({
    mutationFn: (meetingId: string) => dismissInterview(meetingId),
    onSuccess: () => { toast.success("Removed from view"); qc.invalidateQueries({ queryKey: ["contact-meetings", contactId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to dismiss"),
  });

  if (!meetings.length) return <p className="text-sm text-muted-foreground">No meetings yet.</p>;

  return (
    <div>
      {meetings.map((m: any) => (
        <div key={m.id} className="relative group border-b border-border last:border-0">
          <button
            onClick={(e) => { e.preventDefault(); dismissMut.mutate(m.id); }}
            title="Dismiss from view"
            className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground z-10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <Link to="/interviews/$id" params={{ id: m.id }} className="block py-3 pr-10 hover:bg-muted/30 transition-colors">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">{m.title ?? m.meeting_type ?? "Meeting"}</div>
              <Badge variant="outline" className="mr-8">{m.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
          </Link>
        </div>
      ))}
    </div>
  );
}

/* ============ Notes tab (editable) ============ */

function NotesTab({ contactId, initial }: { contactId: string; initial: string }) {
  const qc = useQueryClient();
  const [val, setVal] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const save = useMutation({
    mutationFn: () => updateContact(contactId, { notes: val } as any),
    onSuccess: () => { toast.success("Notes saved"); setDirty(false); qc.invalidateQueries({ queryKey: ["contact", contactId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });
  return (
    <div className="space-y-3">
      <Textarea
        value={val}
        onChange={(e) => { setVal(e.target.value); setDirty(true); }}
        rows={12}
        placeholder="Free-form notes about this contact…"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save notes"}</Button>
      </div>
    </div>
  );
}

/* ============ Red Flags tab ============ */

function RedFlagsTab({ opportunities }: { opportunities: any[] }) {
  const oppIds = opportunities.map((o) => o.id);
  const q = useQuery({
    queryKey: ["contact-flags", oppIds.join(",")],
    enabled: oppIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dd_interviews") as any)
        .select("round, red_flags, opportunity_id")
        .in("opportunity_id", oppIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!oppIds.length) return <p className="text-sm text-muted-foreground">No red flags — flags surface once DD rounds are recorded.</p>;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const flags = (q.data ?? []).flatMap((i: any) =>
    (Array.isArray(i.red_flags) ? i.red_flags : []).map((f: any) => ({ ...(typeof f === "object" ? f : { text: String(f) }), round: i.round })),
  );
  if (!flags.length) return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 inline-flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4" /> No red flags detected — continue to verify claims in later rounds.
    </div>
  );
  return (
    <ul className="space-y-2">
      {flags.map((f: any, i: number) => (
        <li key={i} className="border-b border-border py-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-rose-600" />
            <span className="font-medium text-rose-700">Round {f.round}{f.severity ? ` · ${f.severity}` : ""}</span>
          </span>
          <div className="text-sm text-foreground/80 mt-1 ml-6">{f.text ?? f.flag_text ?? String(f)}</div>
        </li>
      ))}
    </ul>
  );
}

/* ============ Approved deals tab ============ */

function ApprovedDealsTab({ approvedOpps }: { approvedOpps: any[] }) {
  if (!approvedOpps.length) {
    return <p className="text-sm text-muted-foreground">No approved deals yet. Records appear here once a deal completes its workflow and is approved.</p>;
  }
  return (
    <div>
      {approvedOpps.map((o: any) => (
        <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }} className="block border-b border-emerald-200 last:border-0 py-3 hover:bg-emerald-50/40 transition-colors">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">{o.name}</div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border">Approved</Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
