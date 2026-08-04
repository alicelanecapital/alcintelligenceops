import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { updateContact, createContact, fetchContactsByCompanyName, CATEGORY_LABELS } from "@/lib/contacts";
import { generateCompanyDescription, enrichContactDetails } from "@/lib/contacts.functions";
import { EventSelect } from "@/components/EventSelect";
import { CategorySelect } from "@/components/CategorySelect";
import { CompanyCombobox } from "@/components/CompanyCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Building2, User } from "lucide-react";
import { toast } from "sonner";


const LAST_EVENT_KEY = "contacts:last_source_event_id";
const LAST_DATE_KEY = "contacts:last_date_met";

const blankNewContact = { name: "", position: "", email: "", phone: "", category: "" };

export function EditContactDialog({ open, onClose, contact }: { open: boolean; onClose: () => void; contact: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(contact);
  const generateDescription = useServerFn(generateCompanyDescription);
  const enrichDetails = useServerFn(enrichContactDetails);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const lastAutoCompanyRef = useRef<string>("");

  // Other contacts at the same organisation, so you can see who else is there and add
  // another one without leaving this modal -- organisations are the parent entity now,
  // contacts are children of them.
  const companyName = (form.company ?? "").trim();
  const siblings = useQuery({
    queryKey: ["contact-siblings", companyName, contact.id],
    queryFn: () => fetchContactsByCompanyName(companyName, contact.id),
    enabled: open && companyName.length > 1,
  });
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState(blankNewContact);
  const addContactMut = useMutation({
    mutationFn: () => createContact({
      name: newContact.name.trim(),
      company: companyName,
      position: newContact.position.trim() || null,
      email: newContact.email.trim() || null,
      phone: newContact.phone.trim() || null,
      category: newContact.category || "ecosystem",
    } as any),
    onSuccess: () => {
      toast.success("Contact added to this organisation");
      qc.invalidateQueries({ queryKey: ["contact-siblings", companyName, contact.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setNewContact(blankNewContact);
      setAddingContact(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add contact"),
  });

  useEffect(() => { if (open) { setForm(contact); setAddingContact(false); setNewContact(blankNewContact); } }, [open, contact]);

  const m = useMutation({
    mutationFn: () => updateContact(contact.id, {
      name: (form.name?.trim() || form.company?.trim() || contact.name) as string,
      category: form.category, company: form.company, position: form.position,
      email: form.email, phone: form.phone, linkedin: form.linkedin, website: form.website,
      notes: form.notes, status: form.status, ai_summary: form.ai_summary,
      sector: form.sector,
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

  async function runEnrich() {
    if (!form.name?.trim() && !form.company?.trim()) { toast.error("Enter a name or company first"); return; }
    setEnriching(true);
    try {
      const result = await enrichDetails({ data: { name: form.name, company: form.company, position: form.position, website: form.website } });
      setForm((f: any) => ({
        ...f,
        position: f.position?.trim() ? f.position : result.position || f.position,
        website: f.website?.trim() ? f.website : result.website || f.website,
        linkedin: f.linkedin?.trim() ? f.linkedin : result.linkedin || f.linkedin,
        sector: f.sector?.trim() ? f.sector : result.sector || f.sector,
        company_description: f.company_description?.trim() ? f.company_description : result.company_description || f.company_description,
        notes: f.notes?.trim() ? f.notes : result.notes || f.notes,
      }));
      toast.success("Filled in what AI could confidently tell — review before saving");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to enrich contact");
    } finally {
      setEnriching(false);
    }
  }

  function onCompanyBlur() {
    // Auto-fill Name from Company if Name is still blank
    setForm((f: any) => (f.name?.trim() ? f : { ...f, name: f.company ?? "" }));
    autoGenerateIfEmpty();
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Company and Contacts</DialogTitle>
        </DialogHeader>
        <div className="flex justify-start -mt-2">
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={runEnrich} disabled={enriching}>
            <Sparkles className="h-3 w-3 mr-1" />{enriching ? "Enriching…" : "Enrich with AI"}
          </Button>
        </div>
        <div className="grid md:grid-cols-[1fr_260px] gap-5">
          <div className="grid grid-cols-2 gap-3 content-start">
            <F label="Company">
              <CompanyCombobox value={form.company ?? ""} onChange={(v) => setForm({ ...form, company: v })} onBlur={onCompanyBlur} />
            </F>
            <F label="Category">
              <CategorySelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
            </F>
            <F label="Name"><Input placeholder="Defaults to company if blank" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
            <F label="Position"><Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></F>
            <F label="Sector"><Input value={form.sector ?? ""} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="e.g. Hospitality, Fintech" /></F>
            <F label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
            <F label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
            <F label="LinkedIn"><Input value={form.linkedin ?? ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></F>
            <F label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></F>
            <F label="Source event">
              <EventSelect value={form.source_event_id} onChange={setEventSticky} />
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

          {/* Organisation side panel -- see who else is at this company and add another
              contact to it without leaving the modal. */}
          <div className="border-l border-border pl-5">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground mb-2">
              <Building2 className="h-3.5 w-3.5" /> {companyName || "This organisation"}
            </div>

            {!companyName ? (
              <p className="text-xs text-muted-foreground">Enter a company above to see and add other contacts there.</p>
            ) : (
              <>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {siblings.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                  {!siblings.isLoading && !(siblings.data ?? []).length && (
                    <p className="text-xs text-muted-foreground">No other contacts at this organisation yet.</p>
                  )}
                  {(siblings.data ?? []).map((s: any) => (
                    <Link
                      key={s.id}
                      to="/contacts/$id"
                      params={{ id: s.id }}
                      className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 hover:bg-muted/40 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm truncate">{s.name}</span>
                        <span className="flex items-center gap-1 flex-wrap">
                          {s.position && <span className="text-[11px] text-muted-foreground truncate">{s.position}</span>}
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{CATEGORY_LABELS[s.category] ?? s.category}</Badge>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                {addingContact ? (
                  <div className="mt-3 space-y-2 border border-border rounded-md p-2.5">
                    <Input placeholder="Name" className="h-8 text-sm" value={newContact.name} onChange={(e) => setNewContact((f) => ({ ...f, name: e.target.value }))} autoFocus />
                    <Input placeholder="Position (optional)" className="h-8 text-sm" value={newContact.position} onChange={(e) => setNewContact((f) => ({ ...f, position: e.target.value }))} />
                    <Input placeholder="Email (optional)" className="h-8 text-sm" value={newContact.email} onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))} />
                    <Input placeholder="Phone (optional)" className="h-8 text-sm" value={newContact.phone} onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))} />
                    <CategorySelect value={newContact.category || form.category} onChange={(v) => setNewContact((f) => ({ ...f, category: v }))} />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingContact(false); setNewContact(blankNewContact); }}>Cancel</Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addContactMut.mutate()}
                        disabled={!newContact.name.trim() || addContactMut.isPending}
                      >
                        {addContactMut.isPending ? "Adding…" : "Add"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="mt-3 w-full h-8 text-xs" onClick={() => setAddingContact(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add contact to {companyName}
                  </Button>
                )}
              </>
            )}
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
