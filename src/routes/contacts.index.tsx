import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchContacts, createContact, updateContact, deleteContact, CATEGORY_OPTIONS, CATEGORY_LABELS, type ContactRow } from "@/lib/contacts";
import { fetchEvents } from "@/lib/db";
import { generateCompanyDescription, previewDuplicateContacts, mergeDuplicateContacts } from "@/lib/contacts.functions";
import { extractBusinessCard, type ExtractedBusinessCard } from "@/lib/business-card.functions";
import { decodeQrFromDataUrl, parseQrToContact } from "@/lib/qr";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { EditContactDialog } from "@/components/EditContactDialog";
import { EventSelect } from "@/components/EventSelect";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useRef, useState, useMemo } from "react";
import { Plus, Trash2, Mic, ArrowRight, Mail, Phone, Globe, Linkedin as LinkedinIcon, Sparkles, Camera, Upload, RotateCcw, CalendarDays, GitMerge, QrCode, Pencil, X, CalendarPlus } from "lucide-react";
import { ScheduleMeetingDialog } from "@/components/ScheduleMeetingDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { AlphabetChips, firstLetterOf } from "@/components/AlphabetChips";
import { contactColor } from "@/lib/contact-colors";


export const Route = createFileRoute("/contacts/")({
  component: () => <AppShell><ContactsIndex /></AppShell>,
});

function ContactsIndex() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedForm, setScannedForm] = useState<any | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [view, setView] = useViewMode("contacts");
  const [groupBy, setGroupBy] = useState<"none" | "event" | "category" | "company">("event");
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

  const groupedRows = useMemo(() => {
    if (groupBy === "none") return [] as { id: string; name: string; contacts: ContactRow[] }[];
    const map = new Map<string, { id: string; name: string; contacts: ContactRow[] }>();
    for (const c of displayed) {
      let key = "__none__";
      let name = "Ungrouped";
      if (groupBy === "event") {
        key = c.source_event?.id ?? "__none__";
        name = c.source_event?.name ?? "No event";
      } else if (groupBy === "category") {
        const cat = (c.category ?? "unknown") as keyof typeof CATEGORY_LABELS;
        key = String(cat);
        name = CATEGORY_LABELS[cat] ?? "Unknown";
      } else if (groupBy === "company") {
        key = (c.company ?? "").trim().toLowerCase() || "__none__";
        name = c.company?.trim() || "No company";
      }
      if (!map.has(key)) map.set(key, { id: key, name, contacts: [] });
      map.get(key)!.contacts.push(c);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === "__none__") return 1;
      if (b.id === "__none__") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [displayed, groupBy]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Relationships"
        title="Contacts"
        description="Every founder, investor, ecosystem partner, and vendor in one master list. Meet, capture, and progress to opportunity."
        actions={
          <div className="flex gap-2 flex-nowrap items-center">
            <Button variant="outline" onClick={() => setMergeOpen(true)}>
              <GitMerge className="h-4 w-4 mr-1" /> Deduplicate
            </Button>
            <Button variant="outline" onClick={() => setScanOpen(true)}>
              <Camera className="h-4 w-4 mr-1" /> Scan card / QR
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
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
          <SelectTrigger className="w-[190px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="event">Group by Event</SelectItem>
            <SelectItem value="category">Group by Ecosystem</SelectItem>
            <SelectItem value="company">Group by Company</SelectItem>
          </SelectContent>
        </Select>
        {groupBy === "none" && <div className="ml-auto"><ViewToggle mode={view} onChange={setView} /></div>}
      </div>

      <div className="mb-6">
        <AlphabetChips active={letter} onChange={setLetter} available={availableLetters} />
      </div>

      {groupBy !== "none" ? (
        <Accordion type="multiple" className="rounded-lg bg-card px-3">
          {groupedRows.map((g) => (
            <AccordionItem key={g.id} value={g.id}>
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-serif text-base">{g.name}</span>
                  <Badge variant="outline" className="text-[10px]">{g.contacts.length}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-md divide-y divide-border">
                  {g.contacts.map((c) => <ContactListRow key={c.id} c={c} />)}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
          {q.isSuccess && !groupedRows.length && (
            <div className="p-12 text-center text-muted-foreground">
              No contacts match. Try a different filter or add one.
            </div>
          )}
        </Accordion>
      ) : view === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((c) => <ContactCard key={c.id} c={c} />)}
          {q.isSuccess && !displayed.length && (
            <div className="col-span-full rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No contacts match. Try a different filter or add one.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg divide-y divide-border bg-card">
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

      <MergeDuplicatesDialog open={mergeOpen} onClose={() => setMergeOpen(false)} />
    </div>
  );
}

function useContactRowActions() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => { toast.success("Contact deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
  return { editing, setEditing, del };
}

/** Loads upcoming Google Calendar events once and derives per-contact next meeting dates by attendee email. */
function useNextMeetingMap(): Map<string, string> {
  const q = useQuery({
    queryKey: ["contact-next-meetings"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("google_calendar_events")
        .select("start_time, attendees")
        .gte("start_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const row of (q.data ?? []) as any[]) {
      const attendees: any[] = Array.isArray(row.attendees) ? row.attendees : [];
      for (const a of attendees) {
        const email = (a?.email ?? "").toLowerCase();
        if (email && !map.has(email)) map.set(email, row.start_time);
      }
    }
    return map;
  }, [q.data]);
}

function NextMeetingBadge({ email }: { email: string | null | undefined }) {
  const map = useNextMeetingMap();
  if (!email) return null;
  const iso = map.get(email.toLowerCase());
  if (!iso) return null;
  const d = new Date(iso);
  return (
    <Badge className="bg-amber-100 text-amber-900 border-amber-200 border text-[10px] shrink-0" title="Next scheduled meeting">
      <CalendarDays className="h-3 w-3 mr-1" />
      {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </Badge>
  );
}

function ContactCard({ c }: { c: ContactRow }) {
  const primary = c.company || c.name;
  const secondary = c.company ? c.name : c.position;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const qc = useQueryClient();
  const cat = contactColor(c.category);
  const del = useMutation({
    mutationFn: () => deleteContact(c.id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); setConfirming(false); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
  return (
    <>
      <Card className="hover:border-primary/50 transition-colors h-full relative">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link to="/contacts/$id" params={{ id: c.id }} className="flex-1 min-w-0">
              <div className="font-serif text-base leading-tight">{primary}</div>
              {secondary && <div className="text-[11px] text-muted-foreground">{secondary}{c.company && c.position ? ` · ${c.position}` : ""}</div>}
            </Link>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <Badge className={cn("border text-[10px]", cat.badge)}>{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
              <NextMeetingBadge email={c.email} />
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Schedule meeting" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setScheduling(true); }}>
                <CalendarPlus className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

            </div>
          </div>
          <Link to="/contacts/$id" params={{ id: c.id }} className="block space-y-2">
            {(c.source_event || c.date_met) && (
              <div className="text-[11px] text-muted-foreground">
                {c.source_event?.name ? `Met at ${c.source_event.name}` : "Met"} {c.date_met ? `· ${new Date(c.date_met).toLocaleDateString()}` : ""}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
              {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
              {c.website && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> website</span>}
              {c.linkedin && <span className="inline-flex items-center gap-1"><LinkedinIcon className="h-3 w-3" /> linkedin</span>}
            </div>
            <div className="pt-2 flex justify-end">
              <span className="text-xs text-primary inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></span>
            </div>
          </Link>
        </CardContent>
      </Card>
      {editing && <EditContactDialog open={editing} onClose={() => setEditing(false)} contact={c} />}
      <ConfirmDeleteDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={() => del.mutate()} name={primary} pending={del.isPending} />
      <ScheduleMeetingDialog open={scheduling} onOpenChange={setScheduling} contact={c as any} />

    </>
  );
}


function ContactListRow({ c }: { c: ContactRow }) {
  const primary = c.company || c.name;
  const secondary = c.company ? c.name : c.position;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const qc = useQueryClient();
  const cat = contactColor(c.category);
  const del = useMutation({
    mutationFn: () => deleteContact(c.id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); setConfirming(false); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
  return (
    <>
      <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
        <Link to="/contacts/$id" params={{ id: c.id }} className="flex-1 min-w-0 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-base leading-tight truncate">{primary}</span>
              <Badge className={cn("border text-[10px] shrink-0", cat.badge)}>{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
              <NextMeetingBadge email={c.email} />
            </div>
            {secondary && <div className="text-xs text-muted-foreground truncate">{secondary}{c.company && c.position ? ` · ${c.position}` : ""}</div>}
          </div>
          <div className="hidden sm:flex flex-wrap gap-3 text-xs text-muted-foreground shrink-0">
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Schedule meeting" onClick={() => setScheduling(true)}><CalendarPlus className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirming(true)}><Trash2 className="h-3.5 w-3.5" /></Button>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      {editing && <EditContactDialog open={editing} onClose={() => setEditing(false)} contact={c} />}
      <ConfirmDeleteDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={() => del.mutate()} name={primary} pending={del.isPending} />
      <ScheduleMeetingDialog open={scheduling} onOpenChange={setScheduling} contact={c as any} />
    </>
  );
}




function ScanBusinessCardDialog({ open, onClose, onExtracted }: { open: boolean; onClose: () => void; onExtracted: (form: any) => void }) {
  const [mode, setMode] = useState<"choose" | "camera" | "preview">("choose");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
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

  // Attach the stream reactively once the <video> element is actually mounted.
  useEffect(() => {
    if (mode !== "camera" || !stream) return;
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    const tryPlay = () => {
      v.play().catch((err) => {
        toast.error("Couldn't start video preview: " + (err?.message ?? "unknown"));
      });
    };
    if (v.readyState >= 1) {
      tryPlay();
    } else {
      v.addEventListener("loadedmetadata", tryPlay, { once: true });
      return () => v.removeEventListener("loadedmetadata", tryPlay);
    }
  }, [mode, stream]);

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
  }

  async function startCamera() {
    try {
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        // Laptops usually don't have an "environment" camera — fall back to any
        s = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setStream(s);
      setMode("camera");
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

      // Try QR first — much faster and more accurate when present
      const qrRaw = await decodeQrFromDataUrl(capturedDataUrl);
      if (qrRaw) {
        const parsed = parseQrToContact(qrRaw);
        if (parsed.name || parsed.company || parsed.email || parsed.phone || parsed.website) {
          toast.success("QR code decoded");
          onExtracted({
            name: parsed.name ?? "",
            company: parsed.company ?? "",
            position: parsed.position ?? "",
            email: parsed.email ?? "",
            phone: parsed.phone ?? "",
            website: parsed.website ?? "",
            linkedin: parsed.linkedin ?? "",
            notes: parsed.notes ?? "",
            category: "founder",
          });
          setExtracting(false);
          return;
        }
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
        <DialogHeader><DialogTitle>Scan business card or QR</DialogTitle></DialogHeader>

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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={() => videoRef.current?.play().catch(() => {})}
                className="w-full block aspect-[1.6/1] object-cover bg-black"
              />

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

const LAST_EVENT_KEY = "contacts:last_source_event_id";
const LAST_DATE_KEY = "contacts:last_date_met";
function readLastEvent(): string | null {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(LAST_EVENT_KEY) : null; } catch { return null; }
}
function readLastDate(): string | null {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(LAST_DATE_KEY) : null; } catch { return null; }
}

function AddContactDialog({ open, onClose, defaultEventId, initialForm }: { open: boolean; onClose: () => void; defaultEventId?: string; initialForm?: any }) {
  const qc = useQueryClient();

  const buildInitial = () => {
    const base = initialForm ?? { category: "founder" };
    const lastEvent = readLastEvent();
    const lastDate = readLastDate();
    const name = base.name?.trim() ? base.name : (base.company ?? "");
    return {
      ...base,
      name,
      source_event_id: base.source_event_id ?? lastEvent ?? null,
      date_met: base.date_met ?? lastDate ?? "",
    };
  };

  const [form, setForm] = useState<any>(buildInitial);
  const generateDescription = useServerFn(generateCompanyDescription);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const lastAutoCompanyRef = useRef<string>("");

  useEffect(() => {
    if (open) { setForm(buildInitial()); lastAutoCompanyRef.current = ""; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialForm]);

  // Auto-generate AI description when scanned data prefills a company
  useEffect(() => {
    if (!open) return;
    if (!initialForm?.company?.trim()) return;
    if (form.company_description?.trim()) return;
    autoGenerateIfEmpty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialForm]);

  const m = useMutation({
    mutationFn: () => {
      const resolvedName = (form.name?.trim() || form.company?.trim() || "").trim();
      const sourceEventId = form.source_event_id || defaultEventId || null;
      const dateMet = form.date_met || new Date().toISOString().slice(0, 10);
      return createContact({ ...form, name: resolvedName, source_event_id: sourceEventId, date_met: dateMet });
    },
    onSuccess: () => {
      toast.success("Contact added");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setForm({ category: "founder" });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add"),
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
    const c = form.company?.trim() || (initialForm?.company ?? "").trim();
    if (!c || c.length < 2) return;
    if (form.company_description?.trim()) return;
    const key = c.toLowerCase();
    if (lastAutoCompanyRef.current === key) return;
    lastAutoCompanyRef.current = key;
    setGeneratingDescription(true);
    try {
      const { description } = await generateDescription({ data: { company: c, website: form.website, position: form.position } });
      setForm((f: any) => (f.company_description?.trim() ? f : { ...f, company_description: description }));
    } catch { /* silent auto-fail */ } finally {
      setGeneratingDescription(false);
    }
  }

  function setEventSticky(v: string) {
    setForm({ ...form, source_event_id: v || null });
    try { if (v) window.localStorage.setItem(LAST_EVENT_KEY, v); else window.localStorage.removeItem(LAST_EVENT_KEY); } catch {}
  }
  function setDateSticky(v: string) {
    setForm({ ...form, date_met: v });
    try { if (v) window.localStorage.setItem(LAST_DATE_KEY, v); } catch {}
  }
  function clearSticky() {
    try { window.localStorage.removeItem(LAST_EVENT_KEY); window.localStorage.removeItem(LAST_DATE_KEY); } catch {}
    setForm({ ...form, source_event_id: null, date_met: "" });
    toast.success("Cleared sticky event & date");
  }

  const hasSticky = !!(readLastEvent() || readLastDate());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialForm ? "Review scanned contact" : "Add contact"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <Input
              value={form.company ?? ""}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              onBlur={() => {
                setForm((f: any) => (f.name?.trim() ? f : { ...f, name: f.company ?? "" }));
                autoGenerateIfEmpty();
              }}
            />
          </Field>
          <Field label="Category">
            <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Name"><Input placeholder="Defaults to company if blank" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Position"><Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="LinkedIn"><Input value={form.linkedin ?? ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></Field>
          <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
          <Field label="Source event">
            <EventSelect value={form.source_event_id ?? defaultEventId ?? ""} onChange={setEventSticky} />
          </Field>

          <Field label="Date met"><Input type="date" value={form.date_met ?? ""} onChange={(e) => setDateSticky(e.target.value)} /></Field>
          {hasSticky && (
            <div className="col-span-2 -mt-1">
              <button type="button" onClick={clearSticky} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" /> Sticky event & date remembered from your last contact — click to clear
              </button>
            </div>
          )}
          <div className="col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Company description
                {generatingDescription && <span className="ml-2 text-xs text-muted-foreground">Generating with AI…</span>}
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={runGenerate}
                disabled={generatingDescription || !form.company?.trim()}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {generatingDescription ? "Generating…" : "Regenerate"}
              </Button>
            </div>
            <textarea
              className="w-full min-h-[70px] px-3 py-2 border rounded-md text-sm bg-background mt-1"
              value={form.company_description ?? ""}
              onChange={(e) => setForm({ ...form, company_description: e.target.value })}
              placeholder="Auto-generated when you fill in a company"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-sm">Notes</Label>
            <textarea className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm bg-background" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={(!form.name?.trim() && !form.company?.trim()) || m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
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

function MergeDuplicatesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const preview = useServerFn(previewDuplicateContacts);
  const merge = useServerFn(mergeDuplicateContacts);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ groupCount: number; duplicateCount: number; groups: any[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) { setResult(null); setSelected(new Set()); return; }
    setLoading(true);
    preview()
      .then((r: any) => {
        setResult(r);
        setSelected(new Set(r.groups.map((g: any) => g.keep)));
      })
      .catch((e: any) => toast.error(e.message ?? "Failed to scan"))
      .finally(() => setLoading(false));
  }, [open, preview]);

  function toggle(keep: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(keep)) next.delete(keep); else next.add(keep);
      return next;
    });
  }

  async function handleMerge() {
    if (!result) return;
    const selection = result.groups
      .filter((g: any) => selected.has(g.keep))
      .map((g: any) => ({ keepId: g.keep, dupeIds: g.members.filter((m: any) => m.id !== g.keep).map((m: any) => m.id) }));
    if (!selection.length) { toast.error("Select at least one group to merge"); return; }
    setMerging(true);
    try {
      const r: any = await merge({ data: { selection } });
      toast.success(`Merged ${r.mergedCount} duplicate${r.mergedCount === 1 ? "" : "s"} across ${r.groupCount} group${r.groupCount === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Merge failed");
    } finally {
      setMerging(false);
    }
  }

  const selectedDupeCount = result
    ? result.groups.filter((g: any) => selected.has(g.keep)).reduce((n: number, g: any) => n + (g.members.length - 1), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Merge duplicate contacts</DialogTitle></DialogHeader>
        {loading && <div className="py-6 text-sm text-muted-foreground">Scanning contacts…</div>}
        {!loading && result && (
          <div className="space-y-3">
            {result.groupCount === 0 ? (
              <div className="text-sm text-muted-foreground">No duplicates found — your contacts list is clean.</div>
            ) : (
              <>
                <div className="text-sm">
                  Found <strong>{result.groupCount}</strong> duplicate group{result.groupCount === 1 ? "" : "s"}. Uncheck any you want to keep separate.
                </div>
                <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
                  {result.groups.map((g: any) => (
                    <label key={g.keep} className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={selected.has(g.keep)} onCheckedChange={() => toggle(g.keep)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-medium">Keep: {g.keepLabel}</span>
                          {(g.reasons ?? []).map((r: string) => (
                            <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Merging: {g.members.filter((m: any) => m.id !== g.keep).map((m: any) => m.label).join(", ")}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Matched by email, phone (last 9 digits), or name + company. All related meetings, opportunities and events stay linked to the kept contact.
                </div>
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {result && result.groupCount > 0 && (
            <Button onClick={handleMerge} disabled={merging || selectedDupeCount === 0}>
              {merging ? "Merging…" : `Merge ${selectedDupeCount}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

