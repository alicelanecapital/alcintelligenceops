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

function EditContactDialog({ open, onClose, contact }: { open: boolean; onClose: () => void; contact: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(contact);
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents, enabled: open });
  const sortedEvents = useMemo(
    () => [...(events.data ?? [])].sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? "")),
    [events.data],
  );
  const generateDescription = useServerFn(generateCompanyDescription);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const m = useMutation({
    mutationFn: () => updateContact(contact.id, {
      name: (form.name?.trim() || form.company?.trim() || contact.name) as string,
      category: form.category, company: form.company, position: form.position,
      email: form.email, phone: form.phone, linkedin: form.linkedin, website: form.website,
      notes: form.notes, status: form.status, ai_summary: form.ai_summary,
      company_description: form.company_description,
      source_event_id: form.source_event_id || null,
      date_met: form.date_met || null,
    }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["contact", contact.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  async function handleGenerateDescription() {
    if (!form.company?.trim()) { toast.error("Enter a company name first"); return; }
    setGeneratingDescription(true);
    try {
      const { description } = await generateDescription({ data: { company: form.company, website: form.website, position: form.position } });
      setForm((f: any) => ({ ...f, company_description: description }));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate description");
    } finally {
      setGeneratingDescription(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit contact</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <F label="Name"><Input placeholder="Defaults to company if blank" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
          <F label="Category">
            <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </F>
          <F label="Company"><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></F>
          <F label="Position"><Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></F>
          <F label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
          <F label="LinkedIn"><Input value={form.linkedin ?? ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></F>
          <F label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></F>
          <F label="Source event">
            <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.source_event_id ?? ""} onChange={(e) => setForm({ ...form, source_event_id: e.target.value || null })}>
              <option value="">— none —</option>
              {sortedEvents.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </F>
          <F label="Date met"><Input type="date" value={form.date_met ? String(form.date_met).slice(0, 10) : ""} onChange={(e) => setForm({ ...form, date_met: e.target.value })} /></F>
          <F label="Status"><Input value={form.status ?? ""} onChange={(e) => setForm({ ...form, status: e.target.value })} /></F>
          <div className="col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Company description</Label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerateDescription} disabled={generatingDescription || !form.company?.trim()}>
                <Sparkles className="h-3 w-3 mr-1" />{generatingDescription ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
            <textarea className="w-full min-h-[70px] px-3 py-2 border rounded-md text-sm bg-background mt-1" value={form.company_description ?? ""} onChange={(e) => setForm({ ...form, company_description: e.target.value })} placeholder="What does this company do?" />
          </div>
          <div className="col-span-2">
            <Label className="text-sm">Notes</Label>
            <textarea className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm bg-background" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-sm">{label}</Label>{children}</div>;
}
