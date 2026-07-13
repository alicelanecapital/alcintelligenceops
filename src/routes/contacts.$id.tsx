import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchContact, fetchContactMeetings, fetchContactOpportunities, deleteContact, CATEGORY_LABELS } from "@/lib/contacts";
import { startMeetingForContact, createOpportunityFromContact } from "@/lib/contacts.functions";
import { EditContactDialog } from "@/components/EditContactDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Mic, ArrowRight, FileText, Mail, Phone, Globe, Linkedin as LinkedinIcon, Pencil, Trash2, Calendar } from "lucide-react";
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

  if (q.isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="p-10 text-sm text-muted-foreground">Contact not found. <Link to="/contacts" className="text-primary">Back</Link></div>;

  const c: any = q.data;

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow={<Link to="/contacts" className="hover:underline">← Contacts</Link>}
        title={c.name}
        description={c.company ? `${c.company}${c.position ? ` · ${c.position}` : ""}` : ""}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="lg" onClick={() => meetMut.mutate()} disabled={meetMut.isPending}>
              <Mic className="h-4 w-4 mr-1" /> {meetMut.isPending ? "Starting…" : "Meet"}
            </Button>
            <Button variant="outline" onClick={() => oppMut.mutate()} disabled={oppMut.isPending}>
              <ArrowRight className="h-4 w-4 mr-1" /> Create Opportunity
            </Button>
            <Button variant="outline" onClick={() => setRequestOpen(true)}>
              <FileText className="h-4 w-4 mr-1" /> Request Information
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Details</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this contact?")) delMut.mutate(); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<Badge variant="outline">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>} label="Category" />
              {c.email && <InfoRow icon={<Mail className="h-4 w-4" />} label={c.email} />}
              {c.phone && <InfoRow icon={<Phone className="h-4 w-4" />} label={c.phone} />}
              {c.linkedin && <InfoRow icon={<LinkedinIcon className="h-4 w-4" />} label={<a href={c.linkedin} target="_blank" className="hover:underline">LinkedIn</a>} />}
              {c.website && <InfoRow icon={<Globe className="h-4 w-4" />} label={<a href={c.website} target="_blank" className="hover:underline">{c.website}</a>} />}
              {c.date_met && <InfoRow icon={<Calendar className="h-4 w-4" />} label={`Met ${new Date(c.date_met).toLocaleDateString()}`} />}
              {c.status && <InfoRow icon={<Badge variant="secondary">{c.status}</Badge>} label="Status" />}
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
                <Link key={m.id} to="/interviews/$id" params={{ id: m.id }} className="block">
                  <div className="border rounded-md p-3 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">{m.title ?? m.meeting_type ?? "Meeting"}</div>
                      <Badge variant="outline">{m.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </Link>
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
      <RequestInfoModal open={requestOpen} onClose={() => setRequestOpen(false)} contactId={id} contactName={c.name} contactEmail={c.email} />
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



