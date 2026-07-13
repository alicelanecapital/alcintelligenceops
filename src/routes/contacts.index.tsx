import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchContacts, createContact, deleteContact, CATEGORY_OPTIONS, CATEGORY_LABELS, type ContactRow } from "@/lib/contacts";
import { fetchEvents } from "@/lib/db";
import { generateCompanyDescription } from "@/lib/contacts.functions";
import { extractBusinessCard, type ExtractedBusinessCard } from "@/lib/business-card.functions";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState, useMemo } from "react";
import { Plus, Trash2, Mic, ArrowRight, Mail, Phone, Globe, Linkedin as LinkedinIcon, Sparkles, Camera, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { AlphabetChips, firstLetterOf } from "@/components/AlphabetChips";

export const Route = createFileRoute("/contacts/")({
  component: () => <AppShell><ContactsIndex /></AppShell>,
});

function ContactsIndex() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedForm, setScannedForm] = useState<any | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [view, setView] = useViewMode("contacts");
  const q = useQuery({ queryKey: ["contacts", category], queryFn: () => fetchContacts(category) });

  const primaryLabel = (c: ContactRow) => c.company || c.name;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let rows = q.data ?? [];
    if (s) {
      rows = rows.filter((c) =>
        [c.name, c.company, c.email, c.position].filter(Boolean).some((v) => v!.toLowerCase().includes(s)),
      );
    }
    return [...rows].sort((a, b) => primaryLabel(a).localeCompare(primaryLabel(b)));
  }, [q.data, search]);

  const availableLetters = useMemo(() => new Set(filtered.map((c) => firstLetterOf(primaryLabel(c)))), [filtered]);
  const displayed = useMemo(
    () => (letter ? filtered.filter((c) => firstLetterOf(primaryLabel(c)) === letter) : filtered),
    [filtered, letter],
  );

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Relationships"
        title="Contacts"
        description="Every founder, investor, ecosystem partner, and vendor in one master list. Meet, capture, and progress to opportunity."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setScanOpen(true)}>
              <Camera className="h-4 w-4 mr-1" /> Scan business card
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add contact
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
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
        <div className="ml-auto"><ViewToggle mode={view} onChange={setView} /></div>
      </div>

      <div className="mb-6">
        <AlphabetChips active={letter} onChange={setLetter} available={availableLetters} />
      </div>

      {view === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((c) => <ContactCard key={c.id} c={c} />)}
          {q.isSuccess && !displayed.length && (
            <div className="col-span-full rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No contacts match. Try a different filter or add one.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {displayed.map((c) => <ContactListRow key={c.id} c={c} />)}
          {q.isSuccess && !displayed.length && (
            <div className="p-12 text-center text-muted-foreground">
              No contacts match. Try a different filter or add one.
            </div>
          )}
        </div>
      )}

      <AddContactDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <ScanBusinessCardDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onExtracted={(form) => { setScannedForm(form); setScanOpen(false); }}
      />

      {scannedForm && (
        <AddContactDialog
          open={!!scannedForm}
          onClose={() => setScannedForm(null)}
          initialForm={scannedForm}
        />
      )}
    </div>
  );
}

function ContactCard({ c }: { c: ContactRow }) {
  const primary = c.company || c.name;
  const secondary = c.company ? c.name : c.position;
  return (
    <Link to="/contacts/$id" params={{ id: c.id }}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-serif text-lg leading-tight">{primary}</div>
              {secondary && <div className="text-xs text-muted-foreground">{secondary}{c.company && c.position ? ` · ${c.position}` : ""}</div>}
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

function ContactListRow({ c }: { c: ContactRow }) {
  const primary = c.company || c.name;
  const secondary = c.company ? c.name : c.position;
  return (
    <Link to="/contacts/$id" params={{ id: c.id }}>
      <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-base leading-tight truncate">{primary}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
          </div>
          {secondary && <div className="text-xs text-muted-foreground truncate">{secondary}{c.company && c.position ? ` · ${c.position}` : ""}</div>}
        </div>
        <div className="hidden sm:flex flex-wrap gap-3 text-[11px] text-muted-foreground shrink-0">
          {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
          {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
      </div>
    </Link>
  );
}

function ScanBusinessCardDialog({ open, onClose, onExtracted }: { open: boolean; onClose: () => void; onExtracted: (form: any) => void }) {
  const [mode, setMode] = useState<"choose" | "camera" | "preview">("choose");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const extract = useServerFn(extractBusinessCard);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode("choose");
      setCapturedDataUrl(null);
      setExtracting(false);
    }
  }, [open]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        // Laptops usually don't have an "environment" camera — fall back to any
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      setMode("camera");
      // wait for the <video> to mount, attach the stream, then explicitly play
      setTimeout(async () => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        try { await v.play(); } catch { /* autoplay may reject; user gesture already granted */ }
      }, 0);
    } catch (e: any) {
      toast.error("Could not access the camera: " + (e?.message ?? "permission denied"));
    }
  }

  function captureFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setMode("preview");
  }

  function handleFileChosen(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedDataUrl(reader.result as string);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  }

  async function handleUseThisPhoto() {
    if (!capturedDataUrl) return;
    setExtracting(true);
    try {
      const base64 = capturedDataUrl.split(",")[1];
      const mimeType = capturedDataUrl.substring(5, capturedDataUrl.indexOf(";"));

      // Save the photo for the record, best-effort (extraction proceeds even if this fails)
      try {
        const fileName = `card-${Date.now()}.jpg`;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        await supabase.storage.from("business-cards").upload(fileName, bytes, { contentType: mimeType || "image/jpeg" });
      } catch {
        // non-fatal
      }

      const result: ExtractedBusinessCard = await extract({ data: { imageBase64: base64, mimeType: mimeType || "image/jpeg" } });

      if (!result.name && !result.company && !result.email) {
        toast.error("Couldn't read that card clearly — try again with better lighting, or add the contact manually.");
        setExtracting(false);
        return;
      }

      if (result.category === "unknown") {
        toast(`Couldn't confidently tell what kind of contact this is (${result.categoryReasoning || "low confidence"}) — filed under Unknown for you to assign.`);
      } else {
        toast.success(`Looks like a ${result.category} (${result.categoryConfidence}% confidence)`);
      }

      onExtracted({
        name: result.name ?? "",
        company: result.company ?? "",
        position: result.position ?? "",
        email: result.email ?? "",
        phone: result.phone ?? "",
        website: result.website ?? "",
        linkedin: result.linkedin ?? "",
        category: result.category,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to read the card");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Scan business card</DialogTitle></DialogHeader>

        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 border rounded-lg p-6 hover:bg-muted/40 transition-colors"
            >
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Use camera</span>
              <span className="text-xs text-muted-foreground text-center">Laptop webcam or phone camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 border rounded-lg p-6 hover:bg-muted/40 transition-colors"
            >
              <Upload className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Upload photo</span>
              <span className="text-xs text-muted-foreground text-center">Choose an existing image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); }}
            />
          </div>
        )}

        {mode === "camera" && (
          <div className="space-y-3">
            <div className="relative rounded-md overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full block" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="relative w-[88%] aspect-[1.6/1] rounded-lg border-2 border-white/90"
                  style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
                >
                  <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-white rounded-br" />
                </div>
              </div>
              <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white">
                Align the business card within the frame
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { stopCamera(); setMode("choose"); }}>Cancel</Button>
              <Button onClick={captureFromVideo}><Camera className="h-4 w-4 mr-1" /> Capture</Button>
            </div>
          </div>
        )}

        {mode === "preview" && capturedDataUrl && (
          <div className="space-y-3">
            <img src={capturedDataUrl} alt="Captured business card" className="w-full rounded-md border" />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setCapturedDataUrl(null); setMode("choose"); }} disabled={extracting}>
                <RotateCcw className="h-4 w-4 mr-1" /> Retake
              </Button>
              <Button onClick={handleUseThisPhoto} disabled={extracting}>
                {extracting ? "Reading card…" : "Use this photo"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddContactDialog({ open, onClose, defaultEventId, initialForm }: { open: boolean; onClose: () => void; defaultEventId?: string; initialForm?: any }) {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents, enabled: open });
  const [form, setForm] = useState<any>(initialForm ?? { category: "founder" });
  const generateDescription = useServerFn(generateCompanyDescription);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  useEffect(() => {
    if (open) setForm(initialForm ?? { category: "founder" });
  }, [open, initialForm]);

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

  async function handleGenerateDescription() {
    if (!form.company?.trim()) {
      toast.error("Enter a company name first");
      return;
    }
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
        <DialogHeader>
          <DialogTitle>{initialForm ? "Review scanned contact" : "Add contact"}</DialogTitle>
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
            <div className="flex items-center justify-between">
              <Label className="text-sm">Company description</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleGenerateDescription}
                disabled={generatingDescription || !form.company?.trim()}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {generatingDescription ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
            <textarea
              className="w-full min-h-[70px] px-3 py-2 border rounded-md text-sm bg-background mt-1"
              value={form.company_description ?? ""}
              onChange={(e) => setForm({ ...form, company_description: e.target.value })}
              placeholder="What does this company do?"
            />
          </div>
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
