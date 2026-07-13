import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateContact, CATEGORY_OPTIONS } from "@/lib/contacts";
import { fetchEvents } from "@/lib/db";
import { generateCompanyDescription } from "@/lib/contacts.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const LAST_EVENT_KEY = "contacts:last_source_event_id";
const LAST_DATE_KEY = "contacts:last_date_met";

export function EditContactDialog({ open, onClose, contact }: { open: boolean; onClose: () => void; contact: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(contact);
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents, enabled: open });
  const sortedEvents = useMemo(
    () => [...(events.data ?? [])].sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? "")),
    [events.data],
  );
  const generateDescription = useServerFn(generateCompanyDescription);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const lastAutoCompanyRef = useRef<string>("");

  useEffect(() => { if (open) setForm(contact); }, [open, contact]);

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

  async function runGenerate() {
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

  async function autoGenerateIfEmpty() {
    const c = form.company?.trim();
    if (!c || c.length < 2) return;
    if (form.company_description?.trim()) return;
    if (lastAutoCompanyRef.current === c.toLowerCase()) return;
    lastAutoCompanyRef.current = c.toLowerCase();
    setGeneratingDescription(true);
    try {
      const { description } = await generateDescription({ data: { company: c, website: form.website, position: form.position } });
      setForm((f: any) => (f.company_description?.trim() ? f : { ...f, company_description: description }));
    } catch { /* silent */ } finally { setGeneratingDescription(false); }
  }

  function setEventSticky(v: string) {
    setForm({ ...form, source_event_id: v || null });
    try { if (v) window.localStorage.setItem(LAST_EVENT_KEY, v); else window.localStorage.removeItem(LAST_EVENT_KEY); } catch {}
  }
  function setDateSticky(v: string) {
    setForm({ ...form, date_met: v });
    try { if (v) window.localStorage.setItem(LAST_DATE_KEY, v); } catch {}
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
          <F label="Company">
            <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} onBlur={autoGenerateIfEmpty} />
          </F>
          <F label="Position"><Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></F>
          <F label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
          <F label="LinkedIn"><Input value={form.linkedin ?? ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></F>
          <F label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></F>
          <F label="Source event">
            <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.source_event_id ?? ""} onChange={(e) => setEventSticky(e.target.value)}>
              <option value="">— none —</option>
              {sortedEvents.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </F>
          <F label="Date met"><Input type="date" value={form.date_met ? String(form.date_met).slice(0, 10) : ""} onChange={(e) => setDateSticky(e.target.value)} /></F>
          <F label="Status"><Input value={form.status ?? ""} onChange={(e) => setForm({ ...form, status: e.target.value })} /></F>
          <div className="col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Company description {generatingDescription && <span className="ml-2 text-xs text-muted-foreground">Generating with AI…</span>}</Label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={runGenerate} disabled={generatingDescription || !form.company?.trim()}>
                <Sparkles className="h-3 w-3 mr-1" />{generatingDescription ? "Generating…" : "Regenerate"}
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
