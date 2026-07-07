import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchContacts, createContact, deleteContact, CATEGORY_OPTIONS, CATEGORY_LABELS, type ContactRow } from "@/lib/contacts";
import { fetchEvents } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { Plus, Trash2, Mic, ArrowRight, Mail, Phone, Globe, Linkedin as LinkedinIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contacts/")({
  component: () => <AppShell><ContactsIndex /></AppShell>,
});

function ContactsIndex() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const q = useQuery({ queryKey: ["contacts", category], queryFn: () => fetchContacts(category) });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter((c) =>
      [c.name, c.company, c.email, c.position].filter(Boolean).some((v) => v!.toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Relationships"
        title="Contacts"
        description="Every founder, investor, ecosystem partner, and vendor in one master list. Meet, capture, and progress to opportunity."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add contact
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {CATEGORY_OPTIONS.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search name, company, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => <ContactCard key={c.id} c={c} />)}
        {q.isSuccess && !filtered.length && (
          <div className="col-span-full rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No contacts match. Try a different filter or add one.
          </div>
        )}
      </div>

      <AddContactDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ContactCard({ c }: { c: ContactRow }) {
  return (
    <Link to="/contacts/$id" params={{ id: c.id }}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-serif text-lg leading-tight">{c.name}</div>
              {c.company && <div className="text-xs text-muted-foreground">{c.company}{c.position ? ` · ${c.position}` : ""}</div>}
            </div>
            <Badge variant="outline">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
          </div>
          {(c.source_event || c.date_met) && (
            <div className="text-[11px] text-muted-foreground">
              {c.source_event?.name ? `Met at ${c.source_event.name}` : "Met"} {c.date_met ? `· ${new Date(c.date_met).toLocaleDateString()}` : ""}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
            {c.website && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> website</span>}
            {c.linkedin && <span className="inline-flex items-center gap-1"><LinkedinIcon className="h-3 w-3" /> linkedin</span>}
          </div>
          <div className="pt-2 flex justify-end">
            <span className="text-xs text-primary inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AddContactDialog({ open, onClose, defaultEventId }: { open: boolean; onClose: () => void; defaultEventId?: string }) {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents, enabled: open });
  const [form, setForm] = useState<any>({ category: "founder" });

  const m = useMutation({
    mutationFn: () => createContact({ ...form, source_event_id: form.source_event_id || defaultEventId || null, date_met: form.date_met || new Date().toISOString().slice(0, 10) }),
    onSuccess: () => {
      toast.success("Contact added");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setForm({ category: "founder" });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name*"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category">
            <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Company"><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Position"><Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="LinkedIn"><Input value={form.linkedin ?? ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></Field>
          <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
          <Field label="Source event">
            <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.source_event_id ?? defaultEventId ?? ""} onChange={(e) => setForm({ ...form, source_event_id: e.target.value || null })}>
              <option value="">— none —</option>
              {(events.data ?? []).map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </Field>
          <Field label="Date met"><Input type="date" value={form.date_met ?? ""} onChange={(e) => setForm({ ...form, date_met: e.target.value })} /></Field>
          <div className="col-span-2">
            <Label className="text-sm">Notes</Label>
            <textarea className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm bg-background" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={!form.name || m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

export { AddContactDialog };
