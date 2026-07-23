import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createOpportunityFromContact } from "@/lib/contacts.functions";
import {
  getInterview, getUtterances, getAnalyses, getDocRequests, getReport, getNotes,
  saveNote, setInterviewStatus, insertUtterance, editUtterance, stopInterview,
  INTERVIEW_STAGES,
} from "@/lib/interviews";
import { analyzeInterview, finalizeInterview } from "@/lib/interviews.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronRight, Circle, FileText, Mic, Sparkles, StopCircle } from "lucide-react";

export const Route = createFileRoute("/interviews/$id")({ component: () => <AppShell><InterviewWorkspace /></AppShell> });

function InterviewWorkspace() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const interview = useQuery({ queryKey: ["iv", id], queryFn: () => getInterview(id) });
  const report = useQuery({ queryKey: ["iv-report", id], queryFn: () => getReport(id) });

  // Hooks must run unconditionally on every render -- these used to sit after the loading/
  // not-found early returns below, so the very first render (while data is still loading)
  // called two fewer hooks than every render after, which React rejects with "Rendered more
  // hooks than during the previous render." Computing defaultTab defensively (iv may not
  // exist yet) lets these run before any early return.
  const iv = interview.data;
  const defaultTab = iv ? (iv.status === "completed" ? "report" : (iv.status === "live" ? "live" : "brief")) : "brief";
  const [tab, setTab] = useState(defaultTab);
  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  if (interview.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!iv) return <div className="p-10">Not found. <Link to="/interviews" className="underline">Back</Link></div>;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => nav({ to: "/interviews" })} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Diagnostic Engine</div>
              <div className="font-serif text-2xl truncate">{iv.founder_name} <span className="text-muted-foreground">·</span> <span className="text-foreground/70">{iv.business_name}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="uppercase tracking-widest text-[10px]">{iv.industry ?? "—"}</Badge>
            <Badge className={iv.status === "live" ? "bg-red-600 text-white" : iv.status === "completed" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>{iv.status}</Badge>
            {iv.status === "live" && (
              <Button size="sm" variant="destructive" className="h-7 px-2 gap-1" onClick={async () => {
                await stopInterview(id);
                toast.success("Meeting stopped");
                qc.invalidateQueries({ queryKey: ["iv", id] });
              }}><StopCircle className="h-3 w-3" /> Stop</Button>
            )}
          </div>
        </div>
      </div>


      <Tabs value={tab} onValueChange={async (v) => {
        setTab(v);
        if (v === "live" && iv.status !== "live") {
          await setInterviewStatus(id, { status: "live", started_at: new Date().toISOString() });
          qc.invalidateQueries({ queryKey: ["iv", id] });
        }
      }}>
        <div className="border-b border-border bg-white">
          <div className="max-w-[1600px] mx-auto px-8">
            <TabsList className="bg-transparent h-12">
              <TabsTrigger value="brief">Pre-interview brief</TabsTrigger>
              <TabsTrigger value="live">Live workspace</TabsTrigger>
              <TabsTrigger value="report" disabled={iv.status !== "completed" && !report.data}>IC report</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="brief"><BriefView interview={iv} /></TabsContent>
        <TabsContent value="live"><LiveView interview={iv} /></TabsContent>
        <TabsContent value="report"><ReportView interviewId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Brief ---------------- */

function BriefView({ interview }: { interview: any }) {
  const b: any = interview.brief ?? {};
  const kv = (label: string, value: string | undefined) => (
    <div className="border-b border-border py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="text-sm mt-1">{value ?? "—"}</div>
    </div>
  );
  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10 grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardContent className="p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Meeting</div>
          <h2 className="font-serif text-2xl mt-1">{interview.founder_name}</h2>
          <div className="text-sm text-muted-foreground">{interview.business_name}</div>
          {kv("Industry", interview.industry)}
          {kv("Status", interview.status)}
          {kv("Created", new Date(interview.created_at).toLocaleString())}
          {b.summary && <div className="mt-4 p-4 rounded-md bg-secondary text-sm leading-relaxed">{b.summary}</div>}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
        <BriefList title="Suggested focus areas" items={b.focus_areas} icon={<Sparkles className="h-4 w-4 text-primary" />} />
        <BriefList title="Opening questions" items={b.opening_questions} numbered />
        <BriefList title="Known risks" items={b.known_risks} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
        <BriefList title="Potential opportunities" items={b.potential_opportunities} />
        <BriefList title="Outstanding documents" items={b.outstanding_documents} icon={<FileText className="h-4 w-4 text-primary" />} />
      </div>
    </div>
  );
}

function BriefList({ title, items, icon, numbered }: { title: string; items?: string[]; icon?: React.ReactNode; numbered?: boolean }) {
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div className="font-serif text-lg">{title}</div>
      </div>
      {(!items || items.length === 0) ? <div className="text-sm text-muted-foreground italic">None generated.</div> : (
        <ol className={numbered ? "list-decimal pl-5 space-y-2" : "space-y-2"}>
          {items.map((s, i) => <li key={i} className="text-sm text-foreground/85 leading-relaxed">{s}</li>)}
        </ol>
      )}
    </CardContent></Card>
  );
}

/* ---------------- Live workspace ---------------- */

function LiveView({ interview }: { interview: any }) {
  const id = interview.id;
  const qc = useQueryClient();
  const nav = useNavigate();
  const utt = useQuery({ queryKey: ["iv-utt", id], queryFn: () => getUtterances(id), refetchInterval: 4000 });
  const ana = useQuery({ queryKey: ["iv-ana", id], queryFn: () => getAnalyses(id), refetchInterval: 6000 });
  const docs = useQuery({ queryKey: ["iv-docs", id], queryFn: () => getDocRequests(id), refetchInterval: 8000 });
  const notes = useQuery({ queryKey: ["iv-notes", id], queryFn: () => getNotes(id) });

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<"Founder" | "Interviewer">("Founder");
  const [stagePointer, setStagePointer] = useState(interview.current_stage ?? "Founder");
  const startedAtRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [finalizing, setFinalizing] = useState(false);

  // Elapsed timer
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 500);
    return () => clearInterval(t);
  }, [recording]);

  // Auto-run analysis every ~30s of new utterances
  const lastAnalyzedCount = useRef(0);
  useEffect(() => {
    const items = utt.data ?? [];
    if (items.length >= lastAnalyzedCount.current + 3 && !busyRef.current) {
      busyRef.current = true;
      analyzeInterview({ data: { interviewId: id } })
        .then(() => { lastAnalyzedCount.current = items.length; qc.invalidateQueries({ queryKey: ["iv-ana", id] }); qc.invalidateQueries({ queryKey: ["iv-docs", id] }); })
        .catch(() => {})
        .finally(() => { busyRef.current = false; });
    }
  }, [utt.data, id, qc]);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startedAtRef.current = Date.now();
      setRecording(true);
      cycleRecorder(stream);
      toast.success("Recording · transcript will stream below");
    } catch (e: any) {
      toast.error("Microphone unavailable — open the preview in its own tab and allow the mic.");
    }
  }

  function cycleRecorder(stream: MediaStream) {
    // Fresh MediaRecorder per ~6s window so every chunk is a self-contained
    // container the transcription model can decode.
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const ext = mime.includes("webm") ? "webm" : "mp4";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = rec;
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = async () => {
      if (!streamRef.current) return;
      if (streamRef.current.active) cycleRecorder(streamRef.current); // start next window immediately
      const blob = new Blob(chunks, { type: mime });
      if (blob.size < 2000) return;
      const tsStart = Date.now() - startedAtRef.current;
      const fd = new FormData();
      fd.append("file", blob, `chunk.${ext}`);
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        if (!res.ok) return;
        const { text } = await res.json();
        if (!text || !text.trim()) return;
        await insertUtterance(id, { ts_ms: tsStart, speaker: currentSpeaker, text: text.trim() });
        qc.invalidateQueries({ queryKey: ["iv-utt", id] });
      } catch {}
    };
    rec.start();
    setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, 6000);
  }

  function stopRec() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recorderRef.current?.stop();
    setRecording(false);
    // Auto-finalise: the memo is generated the moment recording stops,
    // no separate "End interview" button needed.
    void finalizeNow();
  }

  async function finalizeNow() {
    setFinalizing(true);
    try {
      await finalizeInterview({ data: { interviewId: id } });
      toast.success("Investment memo generated");
      qc.invalidateQueries({ queryKey: ["iv", id] });
      qc.invalidateQueries({ queryKey: ["iv-report", id] });
    } catch (e: any) { toast.error(e.message ?? "Failed to finalise"); }
    finally { setFinalizing(false); }
  }

  async function uploadTranscript(file: File) {
    try {
      const text = await file.text();
      // Try to detect "Speaker: text" lines; fall back to one utterance per non-empty line.
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let ts = 0;
      for (const line of lines) {
        const m = line.match(/^(Founder|Interviewer|F|I|Q|A)\s*[:\-]\s*(.+)$/i);
        const speaker = m ? (m[1].toLowerCase().startsWith("i") || m[1].toLowerCase() === "q" ? "Interviewer" : "Founder") : "Founder";
        const body = m ? m[2] : line;
        await insertUtterance(id, { ts_ms: ts, speaker, text: body });
        ts += 5000;
      }
      qc.invalidateQueries({ queryKey: ["iv-utt", id] });
      toast.success(`Uploaded ${lines.length} lines — generating memo…`);
      await finalizeNow();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to upload transcript");
    }
  }

  const analyses: any[] = ana.data ?? [];
  const risks = analyses.filter(a => a.kind === "risk").slice(0, 8);
  const contradictions = analyses.filter(a => a.kind === "contradiction").slice(0, 6);
  const missing = analyses.filter(a => a.kind === "missing_evidence").slice(0, 6);
  const followUps = analyses.filter(a => a.kind === "follow_up").slice(0, 6);
  const scores: any = analyses.find(a => a.kind === "score")?.payload;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* Header strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border rounded-md overflow-hidden border border-border mb-4">
        <Strip label="Founder" value={interview.founder_name} />
        <Strip label="Business" value={interview.business_name} />
        <Strip label="Stage" value={
          <select value={stagePointer} onChange={(e) => { setStagePointer(e.target.value); setInterviewStatus(id, { current_stage: e.target.value }); }}
            className="bg-transparent border-none outline-none font-serif text-lg p-0">
            {INTERVIEW_STAGES.map(s => <option key={s.name}>{s.name}</option>)}
          </select>
        } />
        <Strip label="Elapsed" value={fmt(elapsed)} />
        <Strip label="Recording" value={
          <span className="inline-flex items-center gap-2">
            <Circle className={`h-2.5 w-2.5 ${recording ? "fill-red-600 text-red-600 animate-pulse" : "fill-muted-foreground text-muted-foreground"}`} />
            {recording ? "Live" : "Idle"}
          </span>
        } />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left rail — interview guide */}
        <aside className="col-span-3 space-y-3">
          <Card><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Interview guide</div>
            <div className="space-y-1.5">
              {INTERVIEW_STAGES.map(s => (
                <button key={s.name}
                  onClick={() => { setStagePointer(s.name); setInterviewStatus(id, { current_stage: s.name }); }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between ${stagePointer === s.name ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                  <span>{s.name}</span><ChevronRight className="h-3 w-3 opacity-50" />
                </button>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sub-topics · {stagePointer}</div>
            <ul className="text-xs space-y-1 text-foreground/75">
              {(INTERVIEW_STAGES.find(s => s.name === stagePointer)?.topics ?? []).map(t => <li key={t}>· {t}</li>)}
            </ul>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Suggested follow-ups</div>
            {followUps.length === 0 ? <div className="text-xs text-muted-foreground italic">Waiting for signal…</div> :
              followUps.map((a: any, i: number) => {
                const p: any = a.payload ?? {};
                return (
                  <div key={i} className="border-b border-border last:border-0 py-2">
                    <div className="text-sm font-medium">{p.question}</div>
                    {p.reason && <div className="text-[11px] text-muted-foreground italic mt-0.5">Why: {p.reason}</div>}
                    {p.alternative && <div className="text-[11px] text-muted-foreground mt-0.5">Alt: {p.alternative}</div>}
                  </div>
                );
              })}
          </CardContent></Card>
        </aside>

        {/* Center — transcript */}
        <section className="col-span-6">
          <Card className="h-full"><CardContent className="p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live transcript</div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-muted-foreground">Speaker:</span>
                {(["Founder", "Interviewer"] as const).map(s => (
                  <button key={s} onClick={() => setCurrentSpeaker(s)}
                    className={`px-2 py-0.5 rounded ${currentSpeaker === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s}</button>
                ))}
                <span className="mx-1 text-muted-foreground">·</span>
                {!recording
                  ? <Button onClick={startRec} size="sm" className="h-7 px-2"><Mic className="h-3.5 w-3.5 mr-1" />Start</Button>
                  : <Button onClick={stopRec} size="sm" variant="destructive" className="h-7 px-2"><StopCircle className="h-3.5 w-3.5 mr-1" />Stop</Button>}
                <label className="inline-flex items-center gap-1 h-7 px-2 rounded border border-input bg-background text-xs cursor-pointer hover:bg-secondary">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{finalizing ? "Finalising…" : "Upload transcript"}</span>
                  <input type="file" accept=".txt,.md,.vtt,.srt,text/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { void uploadTranscript(f); } e.currentTarget.value = ""; }}
                    disabled={finalizing} />
                </label>
              </div>
            </div>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
              {(utt.data ?? []).length === 0 && <div className="text-sm text-muted-foreground italic py-10 text-center">Press Start and speak — transcript appears here.</div>}
              {(utt.data ?? []).map((u: any) => (
                <UtteranceRow key={u.id} u={u} onEdit={async (text) => { await editUtterance(u.id, text); qc.invalidateQueries({ queryKey: ["iv-utt", id] }); }} />
              ))}
            </div>
          </CardContent></Card>
        </section>

        {/* Right — AI analysis */}
        <aside className="col-span-3 space-y-3">
          {scores && (
            <Card><CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Live scoring</div>
              <div className="space-y-2">
                {Object.entries(scores).map(([k, v]: any) => (
                  <div key={k}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize">{k.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="text-[10px]">{v.value}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{v.why}</div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
          <RailList title="Risk alerts" items={risks} render={(p) => (
            <div>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{p.category}</div>
                <Badge className={ratingColor(p.rating)}>{p.rating}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{p.reason}</div>
              {p.mitigation && <div className="text-[11px] mt-1"><span className="font-medium">Mitigation:</span> {p.mitigation}</div>}
            </div>
          )} />
          <RailList title="Contradictions" items={contradictions} render={(p) => (
            <div>
              <div className="text-xs italic">"{p.statement_a}"</div>
              <div className="text-xs italic text-muted-foreground mt-1">vs "{p.statement_b}"</div>
              <div className="text-[11px] mt-1">{p.reason}</div>
            </div>
          )} />
          <RailList title="Missing evidence" items={missing} render={(p) => (
            <div>
              <div className="text-sm font-medium">{p.topic}</div>
              <div className="text-[11px] text-muted-foreground">{p.why}</div>
            </div>
          )} />
          <Card><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Document requests</div>
            {(docs.data ?? []).length === 0 ? <div className="text-xs text-muted-foreground italic">Auto-generated as gaps appear.</div> :
              (docs.data ?? []).slice(0, 8).map((d: any) => (
                <div key={d.id} className="border-b border-border last:border-0 py-1.5">
                  <div className="text-sm">{d.doc_type}</div>
                  {d.reason && <div className="text-[11px] text-muted-foreground">{d.reason}</div>}
                </div>
              ))}
          </CardContent></Card>
        </aside>
      </div>

      {/* Manual assessment */}
      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className="col-span-8">
          <Card><CardContent className="p-6">
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Manual assessment</div>
              <div className="font-serif text-lg">Private notes · never shown externally</div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {["What impressed you?","What concerned you?","Founder credibility","Coachability","Gut feel","Would you invest?"].map(section => (
                <NoteBox key={section} interviewId={id} section={section} initial={(notes.data ?? []).find((n: any) => n.section === section)?.body ?? ""} />
              ))}
            </div>
          </CardContent></Card>
        </div>
        <div className="col-span-4">
          <Card><CardContent className="p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Observations · body language</div>
            <div className="text-xs text-muted-foreground italic mb-3">Interviewer-supplied. Never used as sole basis for a decision.</div>
            {["Eye contact","Energy","Defensiveness","Confidence"].map(s => (
              <NoteBox key={s} interviewId={id} section={s} initial={(notes.data ?? []).find((n: any) => n.section === s)?.body ?? ""} compact />
            ))}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function Strip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-serif text-lg mt-0.5 truncate">{value}</div>
    </div>
  );
}
function fmt(ms: number) { const s = Math.floor(ms/1000); const m = Math.floor(s/60); return `${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }
function ratingColor(r: string) {
  const s = (r ?? "").toLowerCase();
  if (s.startsWith("crit")) return "bg-red-700 text-white";
  if (s.startsWith("high")) return "bg-red-600 text-white";
  if (s.startsWith("med")) return "bg-amber-500 text-white";
  return "bg-secondary text-secondary-foreground";
}

function RailList({ title, items, render }: { title: string; items: any[]; render: (payload: any) => React.ReactNode }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{title}</div>
      {items.length === 0 ? <div className="text-xs text-muted-foreground italic">Nothing flagged yet.</div> :
        <div className="space-y-3">{items.map((a: any) => <div key={a.id} className="border-b border-border last:border-0 pb-2">{render(a.payload)}</div>)}</div>}
    </CardContent></Card>
  );
}

function UtteranceRow({ u, onEdit }: { u: any; onEdit: (text: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(u.text);
  useEffect(() => setVal(u.text), [u.text]);
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
        <span className="font-mono">{fmt(u.ts_ms)}</span>
        <Badge variant="outline" className="text-[10px] py-0">{u.speaker}</Badge>
        {u.confidence != null && <span className="ml-auto">conf {(u.confidence * 100).toFixed(0)}%</span>}
        <button onClick={() => setEditing(!editing)} className="ml-auto hover:text-foreground">{editing ? "Cancel" : "Edit"}</button>
      </div>
      {editing ? (
        <div>
          <Textarea value={val} onChange={(e) => setVal(e.target.value)} className="min-h-20" />
          <div className="mt-2 flex justify-end"><Button size="sm" onClick={async () => { await onEdit(val); setEditing(false); }}>Save</Button></div>
        </div>
      ) : (
        <p className="text-foreground/85 leading-relaxed">{u.text}</p>
      )}
    </div>
  );
}

function NoteBox({ interviewId, section, initial, compact }: { interviewId: string; section: string; initial: string; compact?: boolean }) {
  const [val, setVal] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => setVal(initial), [initial]);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{section}</label>
      <Textarea value={val} onChange={(e) => { setVal(e.target.value); setDirty(true); }}
        onBlur={async () => { if (dirty) { await saveNote(interviewId, section, val); setDirty(false); } }}
        className={compact ? "min-h-14 mt-1 text-xs" : "min-h-20 mt-1"} placeholder="…" />
    </div>
  );
}

/* ---------------- Report ---------------- */

function ReportView({ interviewId }: { interviewId: string }) {
  const report = useQuery({ queryKey: ["iv-report", interviewId], queryFn: () => getReport(interviewId) });
  const interview = useQuery({ queryKey: ["iv", interviewId], queryFn: () => getInterview(interviewId) });
  const nav = useNavigate();
  const createOpp = useServerFn(createOpportunityFromContact);
  const addToPipeline = useMutation({
    mutationFn: async () => {
      const contactId = (interview.data as any)?.contact_id;
      if (!contactId) throw new Error("Meeting isn't linked to a contact");
      return createOpp({ data: { contactId } });
    },
    onSuccess: (opp: any) => {
      toast.success("Added to Deal Pipeline");
      nav({ to: "/dd-interview/$opportunityId/$round", params: { opportunityId: opp.id, round: "1" } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  if (report.isLoading) return <div className="p-10 text-muted-foreground">Loading memo…</div>;
  if (!report.data) return <div className="p-10 text-muted-foreground">No memo yet. Complete the interview to generate the IC report.</div>;
  const r = report.data.body as any;
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10 space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => addToPipeline.mutate()} disabled={addToPipeline.isPending}>
          {addToPipeline.isPending ? "Adding…" : "Add to Deal Pipeline"}
        </Button>
      </div>
      <Recommendation r={r.recommendation} />

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Executive summary" body={r.executive_summary} />
        <Section title="Founder summary" body={r.founder_summary} />
        <Section title="Business summary" body={r.business_summary} />
        <MessCard mess={r.mess_classification} />
      </div>
      <Scorecard readiness={r.investment_readiness} />
      <div className="grid md:grid-cols-2 gap-6">
        <BulletCard title="Strengths" items={r.strengths} tone="good" />
        <BulletCard title="Weaknesses" items={r.weaknesses} tone="warn" />
        <BulletCard title="Value creation opportunities" items={r.value_creation_opportunities} />
        <BulletCard title="Return pathways" items={r.return_pathways} />
      </div>
      <RisksTable rows={r.risk_assessment} />
      <div className="grid md:grid-cols-3 gap-6">
        <BulletCard title="Outstanding questions" items={r.outstanding_questions} />
        <BulletCard title="Evidence required" items={r.evidence_required} />
        <BulletCard title="Recommended next steps" items={r.recommended_next_steps} />
      </div>
      <HundredDay plan={r.hundred_day_plan} />
      <div className="grid md:grid-cols-3 gap-6">
        <KV label="Suggested deal structure" value={r.suggested_deal_structure} />
        <KV label="Equity range" value={r.equity_range} />
        <BulletCard title="Suggested specialists" items={r.suggested_specialists} />
      </div>
      <BulletCard title="Priority workstreams" items={r.priority_workstreams} />
    </div>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  return <Card><CardContent className="p-6">
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
    <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{body ?? "—"}</div>
  </CardContent></Card>;
}
function KV({ label, value }: { label: string; value?: string }) {
  return <Card><CardContent className="p-6">
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    <div className="mt-2 font-serif text-xl">{value ?? "—"}</div>
  </CardContent></Card>;
}
function BulletCard({ title, items, tone }: { title: string; items?: string[]; tone?: "good"|"warn" }) {
  const dotClass = tone === "good" ? "bg-emerald-600" : tone === "warn" ? "bg-amber-600" : "bg-primary";
  return <Card><CardContent className="p-6">
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{title}</div>
    {(!items || items.length === 0) ? <div className="text-sm text-muted-foreground italic">None.</div> :
      <ul className="space-y-2">{items.map((s, i) => <li key={i} className="text-sm flex gap-2"><span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />{s}</li>)}</ul>}
  </CardContent></Card>;
}
function Recommendation({ r }: { r: any }) {
  if (!r) return null;
  const color = r.verdict === "Proceed" ? "bg-emerald-700" : r.verdict?.startsWith("Proceed") ? "bg-emerald-600" : r.verdict === "Decline" ? "bg-red-700" : "bg-amber-600";
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-8">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Investment committee recommendation</div>
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <div className={`${color} text-white font-serif text-3xl px-6 py-3 rounded-md`}>{r.verdict}</div>
          <p className="text-sm text-foreground/80 flex-1 min-w-[300px]">{r.why}</p>
        </div>
        {r.conditions?.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Conditions</div>
            <ul className="space-y-1">{r.conditions.map((c: string, i: number) => <li key={i} className="text-sm">· {c}</li>)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function Scorecard({ readiness }: { readiness: any }) {
  if (!readiness) return null;
  const rows = Object.entries(readiness).filter(([k]) => k !== "overall_score") as [string, any][];
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Investment readiness</div>
          <div className="font-serif text-2xl">Overall {readiness.overall_score}<span className="text-muted-foreground text-lg">/100</span></div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="flex items-center justify-between text-sm"><span className="capitalize">{k.replace(/_/g, " ")}</span><span className="font-mono">{v.score}</span></div>
            <div className="h-1.5 bg-muted rounded"><div className="h-1.5 bg-primary rounded" style={{ width: `${v.score}%` }} /></div>
            <div className="text-[11px] text-muted-foreground mt-1">{v.why}</div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}
function MessCard({ mess }: { mess: any }) {
  if (!mess) return null;
  const color = mess.level?.startsWith("Green") ? "bg-emerald-600" : mess.level?.startsWith("Amber") ? "bg-amber-500" : mess.level?.startsWith("Red") ? "bg-red-600" : mess.level?.startsWith("Black") ? "bg-neutral-900" : "bg-primary";
  return <Card><CardContent className="p-6">
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mess classification</div>
    <div className={`inline-block mt-2 px-3 py-1 rounded text-white font-serif text-lg ${color}`}>{mess.level}</div>
    <div className="text-sm mt-3">{mess.reason}</div>
    {mess.evidence && <div className="text-xs text-muted-foreground mt-2 italic">Evidence: {mess.evidence}</div>}
    {mess.next_step && <div className="text-xs mt-2"><span className="font-medium">Next:</span> {mess.next_step}</div>}
  </CardContent></Card>;
}
function RisksTable({ rows }: { rows: any[] }) {
  return <Card><CardContent className="p-6">
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Risk assessment · Alice Lane framework</div>
    <div className="space-y-2">
      {(rows ?? []).map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-3 py-2 border-b border-border last:border-0">
          <div className="col-span-3 text-sm font-medium">{r.category}</div>
          <div className="col-span-1"><Badge className={ratingColor(r.rating)}>{r.rating}</Badge></div>
          <div className="col-span-4 text-xs">{r.reason}</div>
          <div className="col-span-4 text-xs text-muted-foreground">{r.mitigation}</div>
        </div>
      ))}
    </div>
  </CardContent></Card>;
}
function HundredDay({ plan }: { plan: any[] }) {
  return <Card><CardContent className="p-6">
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">100-day plan</div>
    <div className="space-y-2">
      {(plan ?? []).map((p: any, i: number) => (
        <div key={i} className="grid grid-cols-12 gap-3 py-2 border-b border-border last:border-0">
          <div className="col-span-2 font-mono text-xs">{p.day_range}</div>
          <div className="col-span-4 text-sm font-medium">{p.workstream}</div>
          <div className="col-span-6 text-xs text-muted-foreground">{p.outcome}</div>
        </div>
      ))}
    </div>
  </CardContent></Card>;
}
