import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchContact, fetchContactMeetings, fetchContactOpportunities, deleteContact, uploadContactPhoto, CATEGORY_LABELS } from "@/lib/contacts";
import { startMeetingForContact } from "@/lib/contacts.functions";
import { generateContactStakeholderBrief } from "@/lib/contact-brief.functions";
import { dismissInterview } from "@/lib/interviews";
import { EditContactDialog } from "@/components/EditContactDialog";
import { SmartLink } from "@/components/SmartLink";
import { contactColor } from "@/lib/contact-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { Mic, FileText, Mail, Phone, Globe, Linkedin as LinkedinIcon, Pencil, Trash2, Calendar, X, Building2, Camera, User, Sparkles, RefreshCw } from "lucide-react";
import { NewMeetingDialog } from "@/components/NewMeetingDialog";
import { toast } from "sonner";
import { RequestInfoModal } from "@/components/RequestInfoModal";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contacts/$id")({
  component: () => <AppShell><ContactProfile /></AppShell>,
});

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

  const dismissMeetingMut = useMutation({
    mutationFn: (meetingId: string) => dismissInterview(meetingId),
    onSuccess: () => { toast.success("Removed from view"); qc.invalidateQueries({ queryKey: ["contact-meetings", id] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to dismiss"),
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
  const statusTone = (c.status ?? "").toLowerCase() === "active"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

  const openOpps = (opps.data ?? []).filter((o: any) => ((o.pipeline_status ?? "active").toLowerCase()) !== "approved");
  const approvedOpps = (opps.data ?? []).filter((o: any) => ((o.pipeline_status ?? "").toLowerCase()) === "approved");

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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<Badge className={cn("border", cat.badge)}>{CATEGORY_LABELS[c.category] ?? c.category}</Badge>} label="Category" />
              {c.company && <InfoRow icon={<Building2 className="h-4 w-4" />} label={c.company} />}
              {c.position && <InfoRow icon={<Building2 className="h-4 w-4" />} label={c.position} />}
              {c.email && <InfoRow icon={<Mail className="h-4 w-4" />} label={c.email} />}
              {c.phone && <InfoRow icon={<Phone className="h-4 w-4" />} label={c.phone} />}
              {c.linkedin && <InfoRow icon={<LinkedinIcon className="h-4 w-4" />} label={<a href={c.linkedin} target="_blank" className="hover:underline">LinkedIn</a>} />}
              {c.website && (
                <InfoRow icon={<Globe className="h-4 w-4" />} label={<SmartLink href={c.website} />} />
              )}
              {c.status && (
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <Badge className={cn("border capitalize", statusTone)}>{c.status}</Badge>
                  <span className="text-muted-foreground">Status</span>
                </div>
              )}
              {c.tags && c.tags.length > 0 && (
                <div className="col-span-2 flex flex-wrap gap-1">
                  {c.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>

          {c.company_description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Company description</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">{c.company_description}</CardContent>
            </Card>
          )}

          {/* Opportunities in workflow (not yet approved) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Opportunities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {openOpps.length === 0 && <div className="text-sm text-muted-foreground">No opportunities in workflow.</div>}
              {openOpps.map((o: any) => (
                <Link key={o.id} to="/dd-interview/$opportunityId/$round" params={{ opportunityId: o.id, round: "1" }} className="block">
                  <div className="border rounded-md p-3 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">{o.name}</div>
                      <Badge variant="outline">{o.current_stage}</Badge>
                    </div>
                    {o.summary && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.summary}</div>}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {c.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">{c.notes}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Meeting history</CardTitle>
              <Button size="sm" onClick={() => meetMut.mutate()} disabled={meetMut.isPending}><Mic className="h-4 w-4 mr-1" /> New meeting</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(meetings.data ?? []).length === 0 && <div className="text-sm text-muted-foreground">No meetings yet.</div>}
              {(meetings.data ?? []).map((m: any) => (
                <div key={m.id} className="relative group">
                  <button
                    onClick={(e) => { e.preventDefault(); dismissMeetingMut.mutate(m.id); }}
                    title="Dismiss from view"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground z-10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <Link to="/interviews/$id" params={{ id: m.id }} className="block">
                    <div className="border rounded-md p-3 pr-9 hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium">{m.title ?? m.meeting_type ?? "Meeting"}</div>
                        <Badge variant="outline">{m.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Approved deals (only opportunities that have completed the workflow) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Approved Deals</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {approvedOpps.length === 0 && (
                <div className="text-sm text-muted-foreground">No approved deals yet. Records appear here once a deal completes its workflow and is approved.</div>
              )}
              {approvedOpps.map((o: any) => (
                <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }} className="block">
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-md p-3 hover:border-emerald-400 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">{o.name}</div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border">Approved</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {c.source_event && (
            <Card>
              <CardHeader><CardTitle className="text-base">Source event</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <div className="font-medium">{c.source_event.name}</div>
                {c.source_event.city && <div className="text-xs text-muted-foreground">{c.source_event.city}{c.source_event.country ? `, ${c.source_event.country}` : ""}</div>}
                {c.source_event.start_date && <div className="text-xs text-muted-foreground">{new Date(c.source_event.start_date).toLocaleDateString()}</div>}
                {c.date_met && (
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Met {new Date(c.date_met).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI stakeholder brief */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base inline-flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Stakeholder brief</CardTitle>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Regenerate" onClick={() => briefMut.mutate(true)} disabled={briefMut.isPending}>
                <RefreshCw className={cn("h-3.5 w-3.5", briefMut.isPending && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {c.stakeholder_brief ? (
                <>
                  {c.stakeholder_brief.summary && <p className="text-muted-foreground">{c.stakeholder_brief.summary}</p>}
                  {c.stakeholder_brief.talking_points?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium mb-1">Talking points</div>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                        {c.stakeholder_brief.talking_points.map((t: string, i: number) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                  {c.stakeholder_brief.watch_outs?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium mb-1">Watch-outs</div>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                        {c.stakeholder_brief.watch_outs.map((t: string, i: number) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">No brief yet.</p>
                  <Button size="sm" variant="outline" onClick={() => briefMut.mutate(false)} disabled={briefMut.isPending}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> {briefMut.isPending ? "Generating…" : "Generate brief"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {c.ai_summary && (
            <Card>
              <CardHeader><CardTitle className="text-base">AI summary</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{c.ai_summary}</CardContent>
            </Card>
          )}
        </div>
      </div>

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

function InfoRow({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1 break-words">{label}</div>
    </div>
  );
}
