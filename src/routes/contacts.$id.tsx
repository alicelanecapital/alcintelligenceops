import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchContact, fetchContactMeetings, fetchContactOpportunities, deleteContact, uploadContactPhoto, CATEGORY_LABELS } from "@/lib/contacts";
import { startMeetingForContact, createOpportunityFromContact } from "@/lib/contacts.functions";
import { dismissInterview } from "@/lib/interviews";
import { EditContactDialog } from "@/components/EditContactDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { Mic, FileText, Mail, Phone, Globe, Linkedin as LinkedinIcon, Pencil, Trash2, Calendar, X, Building2, Camera, User } from "lucide-react";
import { toast } from "sonner";
import { RequestInfoModal } from "@/components/RequestInfoModal";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";



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


  const startMeeting = useServerFn(startMeetingForContact);
  const createOpp = useServerFn(createOpportunityFromContact);

  const meetMut = useMutation({
    mutationFn: () => startMeeting({ data: { contactId: id } }),
    onSuccess: (row: any) => {
      toast.success("Meeting started");
      navigate({ to: "/interviews/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const oppMut = useMutation({
    mutationFn: () => createOpp({ data: { contactId: id } }),
    onSuccess: (opp: any) => {
      toast.success("Opportunity created");
      navigate({ to: "/dd-interview/$opportunityId/$round", params: { opportunityId: opp.id, round: "1" } });
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
    onSuccess: () => {
      toast.success("Removed from view");
      qc.invalidateQueries({ queryKey: ["contact-meetings", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to dismiss"),
  });

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const uploadPhotoMut = useMutation({
    mutationFn: (file: File) => uploadContactPhoto(id, file),
    onSuccess: () => {
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["contact", id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to upload photo"),
    onSettled: () => setUploadingPhoto(false),
  });

  if (q.isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="p-10 text-sm text-muted-foreground">Contact not found. <Link to="/contacts" className="text-primary">Back</Link></div>;

  const c: any = q.data;

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
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setUploadingPhoto(true); uploadPhotoMut.mutate(f); }
            e.target.value = "";
          }}
        />
      </div>
      <PageHeader
        eyebrow={<Link to="/contacts" className="hover:underline">← Contacts</Link>}
        title={c.company || c.name}
        description={c.company ? `${c.name}${c.position ? ` · ${c.position}` : ""}` : (c.position ?? "")}

        actions={
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" onClick={() => meetMut.mutate()} disabled={meetMut.isPending}>
              <Mic className="h-3.5 w-3.5 mr-1" /> {meetMut.isPending ? "Starting…" : "Meet"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Request Info
            </Button>
            <Button size="sm" variant="outline" title="Edit every field on this record, including notes" onClick={() => setEditOpen(true)}>
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
              <InfoRow icon={<Badge variant="outline">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>} label="Category" />
              {c.company && <InfoRow icon={<Building2 className="h-4 w-4" />} label={c.company} />}
              {c.position && <InfoRow icon={<Building2 className="h-4 w-4" />} label={c.position} />}
              {c.email && <InfoRow icon={<Mail className="h-4 w-4" />} label={c.email} />}
              {c.phone && <InfoRow icon={<Phone className="h-4 w-4" />} label={c.phone} />}
              {c.linkedin && <InfoRow icon={<LinkedinIcon className="h-4 w-4" />} label={<a href={c.linkedin} target="_blank" className="hover:underline">LinkedIn</a>} />}
              {c.website && <InfoRow icon={<Globe className="h-4 w-4" />} label={<a href={c.website} target="_blank" className="hover:underline">{c.website}</a>} />}
              {c.date_met && <InfoRow icon={<Calendar className="h-4 w-4" />} label={`Met ${new Date(c.date_met).toLocaleDateString()}`} />}
              {c.status && <InfoRow icon={<Badge variant="secondary">{c.status}</Badge>} label="Status" />}
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

          <Card>
            <CardHeader><CardTitle className="text-base">Opportunities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(opps.data ?? []).length === 0 && <div className="text-sm text-muted-foreground">No opportunities created yet.</div>}
              {(opps.data ?? []).map((o: any) => (
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
        </div>

        <div className="space-y-6">
          {c.source_event && (
            <Card>
              <CardHeader><CardTitle className="text-base">Source event</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <div className="font-medium">{c.source_event.name}</div>
                {c.source_event.city && <div className="text-xs text-muted-foreground">{c.source_event.city}{c.source_event.country ? `, ${c.source_event.country}` : ""}</div>}
                {c.source_event.start_date && <div className="text-xs text-muted-foreground">{new Date(c.source_event.start_date).toLocaleDateString()}</div>}
              </CardContent>
            </Card>
          )}
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
        onCreateOpportunity={() => oppMut.mutate()}
        creatingOpportunity={oppMut.isPending}
      />
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => delMut.mutate()}
        name={c.company || c.name}
        pending={delMut.isPending}
      />

    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>{label}</div>
    </div>
  );
}



