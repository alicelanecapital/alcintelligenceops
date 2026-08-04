import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createOpportunityFromContact } from "@/lib/contacts.functions";
import {
  getInterview, getUtterances, getAnalyses, getDocRequests, getReport, getNotes,
  saveNote, setInterviewStatus, insertUtterance, setInterviewPlaybook,
  deleteInterview, deleteUtterance, clearTranscript,
} from "@/lib/interviews";
import { listToolkits } from "@/lib/toolkits";
import { analyzeInterview, finalizeInterview } from "@/lib/interviews.functions";
import { getInterviewVideoSignedUrl, deleteBehavioralSignals } from "@/lib/interview-video-storage";
import { fetchPlaybookShape, fetchPlaybookStepDetail, type PlaybookShape } from "@/lib/playbook-questions";
import { RoundStepper } from "@/components/RoundStepper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { fetchContact } from "@/lib/contacts";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, Mic, Sparkles, StopCircle, FileOutput, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { TemplatePickerDialog } from "@/components/TemplatePickerDialog";

export const Route = createFileRoute("/interviews/$id")({ component: () => <AppShell><InterviewWorkspace /></AppShell> });

function InterviewWorkspace() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const interview = useQuery({ queryKey: ["iv", id], queryFn: () => getInterview(id) });
  const report = useQuery({ queryKey: ["iv-report", id], queryFn: () => getReport(id) });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const deleteMeeting = useMutation({
    mutationFn: () => deleteInterview(id),
    onSuccess: () => {
      toast.success("Meeting deleted");
      qc.invalidateQueries({ queryKey: ["interviews"] });
      nav({ to: "/interviews" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete meeting"),
  });

  const iv = interview.data;
  // There's only one workspace view now (the pre-interview brief tab was removed), so
  // opening a meeting goes straight to live status instead of waiting on a tab switch.
  useEffect(() => {
    if (iv && iv.status !== "live" && iv.status !== "completed") {
      setInterviewStatus(id, { status: "live", started_at: new Date().toISOString() })
        .then(() => qc.invalidateQueries({ queryKey: ["iv", id] }));
    }
  }, [iv, id, qc]);

  if (interview.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!iv) return <div className="p-10">Not found. <Link to="/interviews" className="underline">Back</Link></div>;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => nav({ to: "/interviews" })} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live Workspace</div>
              <div className="font-serif text-2xl truncate">{iv.founder_name} <span className="text-muted-foreground">·</span> <span className="text-foreground/70">{iv.business_name}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="uppercase tracking-widest text-[10px]">{iv.industry ?? "—"}</Badge>
            <Badge className={iv.status === "completed" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>{iv.status === "live" ? "Paused" : iv.status}</Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete meeting" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => deleteMeeting.mutate()}
        pending={deleteMeeting.isPending}
        title="Delete meeting?"
        name={`${iv.founder_name} · ${iv.business_name}`}
        description="This will permanently delete this meeting, its transcript, analyses and generated memo. This cannot be undone."
      />


      <LiveView interview={iv} reportAvailable={iv.status === "completed" || !!report.data} />
    </div>
  );
}

/* ---------------- Live workspace ---------------- */

function LiveView({ interview, reportAvailable }: { interview: any; reportAvailable: boolean }) {
  const id = interview.id;
  const qc = useQueryClient();
  const nav = useNavigate();
  const createOpp = useServerFn(createOpportunityFromContact);
  const addToPipeline = useMutation({
    mutationFn: async () => {
      const contactId = interview.contact_id;
      if (!contactId) throw new Error("Meeting isn't linked to a contact");
      return createOpp({ data: { contactId } });
    },
    onSuccess: (opp: any) => {
      toast.success("Added to Deal Pipeline");
      nav({ to: "/dd-interview/$opportunityId/$round", params: { opportunityId: opp.id, round: "1" } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  // (nav removed — finalise auto-runs on Stop and refreshes queries in place)
  const utt = useQuery({ queryKey: ["iv-utt", id], queryFn: () => getUtterances(id), refetchInterval: 4000 });
  const ana = useQuery({ queryKey: ["iv-ana", id], queryFn: () => getAnalyses(id), refetchInterval: 6000 });
  const docs = useQuery({ queryKey: ["iv-docs", id], queryFn: () => getDocRequests(id), refetchInterval: 8000 });
  const notes = useQuery({ queryKey: ["iv-notes", id], queryFn: () => getNotes(id) });
  const contactQ = useQuery({
    queryKey: ["iv-contact", interview.contact_id],
    queryFn: () => fetchContact(interview.contact_id),
    enabled: !!interview.contact_id,
  });

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<"Founder" | "Interviewer">("Founder");
  const startedAtRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [finalizing, setFinalizing] = useState(false);
  const [openSessions, setOpenSessions] = useState<string[]>([]);
  const [clearTranscriptOpen, setClearTranscriptOpen] = useState(false);
  const clearTranscriptMut = useMutation({
    mutationFn: () => clearTranscript(id),
    onSuccess: () => {
      toast.success("Transcript cleared");
      qc.invalidateQueries({ queryKey: ["iv-utt", id] });
      setClearTranscriptOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to clear transcript"),
  });
  const deleteUtteranceMut = useMutation({
    mutationFn: (utteranceId: string) => deleteUtterance(utteranceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["iv-utt", id] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to delete line"),
  });

  // Playbook: the top-of-workspace stepper and left-hand questions column both come from
  // the playbook picked when the meeting was started. Fallback to the DD Intelligence
  // Engine template so pre-playbook interviews still render their historical 5-round view.
  const playbook = useQuery<PlaybookShape>({
    queryKey: ["iv-playbook", interview.playbook_id ?? "default"],
    queryFn: () => fetchPlaybookShape(interview.playbook_id ?? null),
  });
  const toolkits = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits });
  // Lets a completed meeting be re-viewed against a different playbook's questions --
  // its own transcript/video/analyses are unaffected, this only changes which reference
  // question set is shown alongside them.
  const changePlaybook = useMutation({
    mutationFn: (newPlaybookId: string) => setInterviewPlaybook(id, newPlaybookId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["iv", id] });
      qc.invalidateQueries({ queryKey: ["iv-playbook"] });
      qc.invalidateQueries({ queryKey: ["iv-playbook-step"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to change playbook"),
  });
  const steps = playbook.data?.steps ?? [];
  const [currentStep, setCurrentStep] = useState<number>(1);
  useEffect(() => {
    if (steps.length && !steps.some((s) => s.key === currentStep)) setCurrentStep(steps[0].key);
  }, [steps, currentStep]);
  const stepDetail = useQuery({
    queryKey: ["iv-playbook-step", playbook.data?.playbookId ?? "none", currentStep],
    enabled: Boolean(playbook.data),
    queryFn: () => fetchPlaybookStepDetail(playbook.data!, currentStep),
  });

  // Elapsed timer
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 500);
    return () => clearInterval(t);
  }, [recording]);

  // Auto-stop when the tab is hidden, the page unloads, or the workspace
  // unmounts — otherwise leaving the screen keeps the recorder running silently.
  const recordingRef = useRef(false);
  useEffect(() => { recordingRef.current = recording; }, [recording]);
  // Stop the recorder cleanly if the tab actually unloads or the workspace
  // unmounts. Do NOT tie this to `visibilitychange` — a routine tab switch
  // (checking notes, opening a document) would otherwise silently stop
  // recording and auto-finalise the memo mid-meeting with no way to resume.
  useEffect(() => {
    const onUnload = () => { if (recordingRef.current) stopRec(); };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (recordingRef.current) stopRec();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
    setOpenSessions([]);
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
      setOpenSessions([]);
      toast.success(`Uploaded ${lines.length} lines — generating memo…`);
      await finalizeNow();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to upload transcript");
    }
  }

  const analyses: any[] = ana.data ?? [];
  const scores: any = analyses.find(a => a.kind === "score")?.payload;
  const behavioralSignalsRow: any = [...analyses].reverse().find(a => a.kind === "behavioral_signals");
  const behavioralSignals: any = behavioralSignalsRow?.payload;
  const transcriptSummary: string | undefined = analyses.find(a => a.kind === "transcript_summary")?.payload?.summary;

  // ---- Dedup + cross-frame precedence (see plan §7) ----
  const rawRisks = analyses.filter(a => a.kind === "risk");
  const rawContradictions = analyses.filter(a => a.kind === "contradiction");
  const rawMissing = analyses.filter(a => a.kind === "missing_evidence");
  const rawFollowUps = analyses.filter(a => a.kind === "follow_up");
  const rawDocs = (docs.data ?? []) as any[];

  const contradictions = dedupList(rawContradictions, (a) => {
    const p = a.payload ?? {};
    const pair = [norm(p.statement_a), norm(p.statement_b)].sort().join("|");
    return `${pair}|${norm(p.reason)}`;
  }, (a) => `${a.payload?.statement_a ?? ""} ${a.payload?.statement_b ?? ""} ${a.payload?.reason ?? ""}`);

  const contradictionSigs = new Set(contradictions.flatMap((a: any) => [norm(a.payload?.statement_a), norm(a.payload?.statement_b), norm(a.payload?.reason)]).filter(Boolean));

  const risks = dedupList(rawRisks, (a) => {
    const p = a.payload ?? {};
    return `${norm(p.category)}|${norm(p.reason)}`;
  }, (a) => `${a.payload?.category ?? ""} ${a.payload?.reason ?? ""}`).filter((a: any) => {
    const sig = norm(a.payload?.reason);
    // drop risk if its reason is already told by a contradiction
    return !anyJaccard(sig, [...contradictionSigs], 0.8);
  }).slice(0, 24);

  const riskSigs = new Set(risks.flatMap((a: any) => [norm(a.payload?.category), norm(a.payload?.reason)]).filter(Boolean));

  const missing = dedupList(rawMissing, (a) => norm(a.payload?.topic || a.payload?.why), (a) => `${a.payload?.topic ?? ""} ${a.payload?.why ?? ""}`)
    .filter((a: any) => {
      const sig = norm(a.payload?.topic || a.payload?.why);
      return !anyJaccard(sig, [...riskSigs], 0.8);
    }).slice(0, 20);

  const missingSigs = new Set(missing.map((a: any) => norm(a.payload?.topic || a.payload?.why)).filter(Boolean));

  const followUps = dedupList(rawFollowUps, (a) => norm(a.payload?.question), (a) => `${a.payload?.question ?? ""} ${a.payload?.reason ?? ""} ${a.payload?.alternative ?? ""}`)
    .filter((a: any) => {
      const sig = norm(a.payload?.question);
      // remove follow-up if it token-contains a missing-evidence topic
      const toks = new Set(sig.split(" ").filter(Boolean));
      for (const m of missingSigs) {
        const mt = m.split(" ").filter(Boolean);
        if (mt.length && mt.every((t) => toks.has(t))) return false;
      }
      return true;
    }).slice(0, 20);

  const documentRequests = dedupList(rawDocs, (d) => norm(d.doc_type), (d) => `${d.doc_type ?? ""} ${d.reason ?? ""}`)
    .filter((d: any) => !missingSigs.has(norm(d.doc_type))).slice(0, 20);

  // Group risks by category for accordion
  const risksByCategory = groupRisks(risks);


  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* Playbook stepper — replaces the old header strip. Renders horizontally at the
       * top of the workspace and drives which questions appear in the left column. */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Playbook</div>
            <select
              value={interview.playbook_id ?? ""}
              onChange={(e) => e.target.value && changePlaybook.mutate(e.target.value)}
              disabled={changePlaybook.isPending}
              className="font-serif text-lg text-green-800 bg-transparent border-0 -ml-1 px-1 py-0.5 rounded hover:bg-muted/50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {!interview.playbook_id && <option value="">{playbook.data?.playbookName ?? "Meeting"}</option>}
              {(toolkits.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="text-[11px] text-muted-foreground -mt-1">Switch playbooks to see what other templates would examine in this same transcript/video — doesn't change what's already recorded.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} disabled={!reportAvailable}>
              <FileOutput className="h-3.5 w-3.5 mr-1" /> Generate Report
            </Button>
            <Button size="sm" onClick={() => addToPipeline.mutate()} disabled={!reportAvailable || addToPipeline.isPending}>
              {addToPipeline.isPending ? "Adding…" : "Add to Deal Pipeline"}
            </Button>
          </div>
        </div>
        <TemplatePickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(templateId) => nav({ to: "/interviews/$id/board-report", params: { id }, search: { template: templateId } })}
        />
        {steps.length > 0 && (
          <RoundStepper
            rounds={steps.map((s) => ({ round: s.key, title: s.title, subtitle: s.subtitle }))}
            current={currentStep}
            onSelect={(k) => setCurrentStep(k)}
            orientation="horizontal"
          />
        )}
      </div>

      {interview.contact_id && (
        <Accordion type="single" collapsible className="mb-4 rounded-md border border-sky-200 bg-sky-50 overflow-hidden">
          <AccordionItem value="stakeholder-brief" className="border-0">
            <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-900"><Sparkles className="h-3.5 w-3.5" /> Stakeholder Brief</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {contactQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : contactQ.data?.stakeholder_brief ? (
                <div className="space-y-2 text-sm text-sky-900">
                  {contactQ.data.stakeholder_brief.summary && <p className="leading-relaxed">{contactQ.data.stakeholder_brief.summary}</p>}
                  {(contactQ.data.stakeholder_brief.background_points?.length ?? 0) > 0 && (
                    <ul className="list-disc list-inside text-xs text-sky-800 space-y-0.5">
                      {contactQ.data.stakeholder_brief.background_points!.map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No stakeholder brief yet — generate one from the contact's profile.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Col 1 — playbook questions for the current step */}
        <aside className="col-span-3 space-y-3">
          <Card><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {stepDetail.data?.step.title ?? "Questions"}
            </div>
            {stepDetail.isLoading ? (
              <div className="text-xs text-muted-foreground italic">Loading questions…</div>
            ) : (stepDetail.data?.questions.length ?? 0) === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                {playbook.data?.kind === "custom"
                  ? "This playbook has no questions configured yet."
                  : "No questions for this step."}
              </div>
            ) : (
              <Accordion type="multiple" className="rounded-md border border-teal-100">
                {(stepDetail.data?.questions ?? []).map((q, i) => (
                  <AccordionItem key={q.id} value={q.id} className="border-teal-100 last:border-b-0">
                    <AccordionTrigger className="text-sm px-2 py-1.5 hover:no-underline bg-teal-50">
                      <span className="text-left font-medium text-foreground/90">Q{i + 1}. {q.question_text}</span>
                    </AccordionTrigger>
                    {(q.why_text || q.internal_guideline) && (
                      <AccordionContent className="px-2 pb-1.5 space-y-1.5">
                        {q.why_text && <div className="text-[11px] text-muted-foreground not-italic">{q.why_text}</div>}
                        {q.internal_guideline && (
                          <div className="text-[11px] text-amber-800 not-italic bg-amber-50 border border-amber-100 rounded px-1.5 py-1">
                            <span className="font-medium">Internal guideline:</span> {q.internal_guideline}
                          </div>
                        )}
                      </AccordionContent>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent></Card>

          {(stepDetail.data?.documents.length ?? 0) > 0 && (
            <Card><CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Required documents</div>
              <ul className="space-y-1">
                {(stepDetail.data?.documents ?? []).map((d) => (
                  <li key={d.id} className="text-xs flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>
                      <span className="text-foreground/90">{d.name}</span>
                      {d.purpose && <div className="text-[11px] text-muted-foreground">{d.purpose}</div>}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          )}
        </aside>


        {/* Cols 2–3 — transcript on top, live scoring below */}
        <section className="col-span-6 space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live transcript</div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-muted-foreground">Speaker:</span>
                  {(["Founder", "Interviewer"] as const).map(s => (
                    <button key={s} onClick={() => setCurrentSpeaker(s)}
                      className={`px-2 py-0.5 rounded ${currentSpeaker === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s}</button>
                  ))}
                  <span className="mx-1 text-muted-foreground">·</span>
                  <Button onClick={startRec} size="sm" className="h-7 px-2" disabled={recording}><Mic className="h-3.5 w-3.5 mr-1" />Start</Button>
                  <Button onClick={stopRec} size="sm" variant="destructive" className="h-7 px-2" disabled={!recording}><StopCircle className="h-3.5 w-3.5 mr-1" />Stop</Button>
                  <label className="inline-flex items-center gap-1 h-7 px-2 rounded border border-input bg-background text-xs cursor-pointer hover:bg-secondary">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{finalizing ? "Finalising…" : "Upload transcript"}</span>
                    <input type="file" accept=".txt,.md,.vtt,.srt,text/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) { void uploadTranscript(f); } e.currentTarget.value = ""; }}
                      disabled={finalizing} />
                  </label>
                  {(utt.data ?? []).length > 0 && (
                    <Button
                      size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setClearTranscriptOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Transcript
                    </Button>
                  )}
                </div>
              </div>
              <Accordion type="multiple" value={openSessions} onValueChange={setOpenSessions}>
                {transcriptGroups(utt.data ?? [], interview).map((g) => (
                  <AccordionItem key={g.id} value={g.id} className="border-0">
                    <AccordionTrigger className="hover:no-underline py-1 justify-start gap-2 [&>svg]:ml-1">
                      <span className="bg-green-800 text-white text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                        {g.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="max-h-[65vh] overflow-y-auto pr-2 pt-2">
                        {g.utterances.length === 0 && <div className="text-sm text-muted-foreground italic py-10 text-center">Press Start and speak — transcript appears here.</div>}
                        <div className="space-y-2">
                          {g.utterances.map((u: any) => (
                            <UtteranceRow key={u.id} u={u} onDelete={() => deleteUtteranceMut.mutate(u.id)} />
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <ConfirmDeleteDialog
            open={clearTranscriptOpen}
            onClose={() => setClearTranscriptOpen(false)}
            onConfirm={() => clearTranscriptMut.mutate()}
            pending={clearTranscriptMut.isPending}
            title="Clear transcript?"
            description="This will permanently delete every transcript line for this meeting. The meeting record, memo and analyses stay in place. This cannot be undone."
            confirmLabel="Clear transcript"
          />

          {transcriptSummary && (
            <Accordion type="single" collapsible className="rounded-md border border-border bg-white overflow-hidden">
              <AccordionItem value="summary" className="border-0">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Summary</div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <p className="text-sm text-foreground/85 leading-relaxed">{transcriptSummary}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {scores && (
            <Card><CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Live scoring</div>
              <div className="space-y-2">
                {Object.entries(scores).map(([k, v]: any) => (
                  <div key={k}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize">{k.replace(/_/g, " ")}</span>
                      <Badge className={`text-[10px] border ${scoreTone(v.value)}`}>{v.value}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{v.why}</div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
        </section>

        {/* Col 4 — Risk alerts (top), then rest */}
        <aside className="col-span-3 space-y-3">
          <Card><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Risk alerts</div>
            {risks.length === 0 ? <div className="text-xs text-muted-foreground italic">Nothing flagged yet.</div> : (
              <Accordion type="multiple" defaultValue={[]}>
                {risksByCategory.map((grp) => (
                  <AccordionItem key={grp.category} value={grp.category} className="border-b border-border last:border-0">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center justify-between w-full pr-2 gap-2">
                        <span className="text-sm font-medium text-left">{grp.category} <span className="text-muted-foreground">({grp.items.length})</span></span>
                        {grp.avgLabel && <Badge className={ratingColor(grp.avgLabel)}>{grp.avgLabel}</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-1">
                        {grp.items.map((a: any) => {
                          const p = a.payload ?? {};
                          return (
                            <div key={a.id} className="border-b border-border last:border-0 pb-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{p.category}</div>
                                {p.rating && <Badge className={ratingColor(p.rating)}>{p.rating}</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{p.reason}</div>
                              {p.mitigation && <div className="text-[11px] mt-1"><span className="font-medium">Mitigation:</span> {p.mitigation}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent></Card>

          <CollapsedListCard title="Contradictions" count={contradictions.length} emptyText="Nothing flagged yet." pill="red">
            {contradictions.map((a: any) => {
              const p = a.payload ?? {};
              return (
                <div key={a.id} className="border-b border-border last:border-0 py-2">
                  <div className="text-xs italic">"{p.statement_a}"</div>
                  <div className="text-xs italic text-muted-foreground mt-1">vs "{p.statement_b}"</div>
                  <div className="text-[11px] mt-1">{p.reason}</div>
                </div>
              );
            })}
          </CollapsedListCard>

          <CollapsedListCard title="Missing evidence" count={missing.length} emptyText="Nothing flagged yet." pill="red">
            {missing.map((a: any) => {
              const p = a.payload ?? {};
              return (
                <div key={a.id} className="border-b border-border last:border-0 py-2">
                  <div className="text-sm font-medium">{p.topic}</div>
                  <div className="text-[11px] text-muted-foreground">{p.why}</div>
                </div>
              );
            })}
          </CollapsedListCard>

          <CollapsedListCard title="Suggested follow-ups" count={followUps.length} emptyText="Waiting for signal…" pill="green">
            {followUps.map((a: any, i: number) => {
              const p: any = a.payload ?? {};
              return (
                <div key={a.id ?? i} className="border-b border-border last:border-0 py-2">
                  <div className="text-sm font-medium">{p.question}</div>
                  {p.reason && <div className="text-[11px] text-muted-foreground italic mt-0.5">Why: {p.reason}</div>}
                  {p.alternative && <div className="text-[11px] text-muted-foreground mt-0.5">Alt: {p.alternative}</div>}
                </div>
              );
            })}
          </CollapsedListCard>

          <CollapsedListCard title="Document requests" count={documentRequests.length} emptyText="Auto-generated as gaps appear." pill="green">
            {documentRequests.map((d: any) => (
              <div key={d.id} className="border-b border-border last:border-0 py-1.5">
                <div className="text-sm">{d.doc_type}</div>
                {d.reason && <div className="text-[11px] text-muted-foreground">{d.reason}</div>}
              </div>
            ))}
          </CollapsedListCard>
        </aside>
      </div>


      {/* Manual assessment forms -- orange border marks them as human-supplied,
       * collapsed by default so AI panels dominate the workspace. */}
      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className="col-span-8">
          <Accordion type="single" collapsible className="rounded-md border border-amber-300 bg-white overflow-hidden">
            <AccordionItem value="manual" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-amber-50">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-800">Manual assessment</div>
                  <div className="text-sm text-amber-900">Private notes · never shown externally</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  {["What impressed you?","What concerned you?","Founder credibility","Coachability","Gut feel","Would you invest?"].map(section => (
                    <NoteBox key={section} interviewId={id} section={section} initial={(notes.data ?? []).find((n: any) => n.section === section)?.body ?? ""} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="col-span-4">
          <Accordion type="single" collapsible className="rounded-md border border-amber-300 bg-white overflow-hidden">
            <AccordionItem value="body" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-amber-50">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-800">Observations · body language</div>
                  <div className="text-xs text-amber-900/80 italic">Interviewer-supplied. Never used as sole basis for a decision.</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="pt-2">
                  {["Eye contact","Energy","Defensiveness","Confidence"].map(s => (
                    <NoteBox key={s} interviewId={id} section={s} initial={(notes.data ?? []).find((n: any) => n.section === s)?.body ?? ""} compact />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {behavioralSignals && (
        <BehavioralSignalsPanel
          interviewId={id}
          analysisId={behavioralSignalsRow.id}
          signals={behavioralSignals}
          onDeleted={() => qc.invalidateQueries({ queryKey: ["iv-ana", id] })}
        />
      )}

      {reportAvailable && playbook.data?.kind === "due_diligence" && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Summary</div>
          <ReportContent interviewId={id} />
        </div>
      )}
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
function transcriptGroups(utterances: any[], interview: any) {
  // Today each interview holds one transcript session. Grouping by session_id
  // lets future multi-session meetings stack transcripts newest-first.
  const map = new Map<string, any[]>();
  for (const u of utterances) {
    const key = u.session_id || "current";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(u);
  }
  if (map.size === 0) {
    const d = interview?.started_at ? new Date(interview.started_at) : new Date();
    return [{ id: "current", title: transcriptGroupTitle(d), utterances: [] }];
  }
  const groups = Array.from(map.entries()).map(([id, items]) => {
    const d = items[0]?.created_at ? new Date(items[0].created_at) : (interview?.started_at ? new Date(interview.started_at) : new Date());
    return { id, title: transcriptGroupTitle(d), utterances: items };
  });
  groups.sort((a, b) => {
    const ta = a.utterances[0]?.created_at || 0;
    const tb = b.utterances[0]?.created_at || 0;
    return tb.localeCompare(ta);
  });
  return groups;
}
function transcriptGroupTitle(d: Date) {
  return `TRANSCRIPT · ${format(d, "MMM d, yyyy").toUpperCase()} · ${format(d, "HH:mm")}`;
}
function scoreTone(value: any) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!isFinite(n)) {
    const s = String(value).toLowerCase();
    if (s.includes("low") || s === "poor") return "bg-red-100 text-red-800 border-red-200";
    if (s.includes("medium") || s === "fair" || s.includes("moderate")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (s.includes("high") || s === "good" || s.includes("strong")) return "bg-green-100 text-green-800 border-green-200";
    return "bg-secondary text-secondary-foreground border-border";
  }
  if (n >= 8) return "bg-green-100 text-green-800 border-green-200";
  if (n >= 5) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}
function ratingColor(r: string) {
  const s = (r ?? "").toLowerCase();
  if (s.startsWith("crit")) return "bg-red-700 text-white";
  if (s.startsWith("high")) return "bg-red-600 text-white";
  if (s.startsWith("med")) return "bg-amber-500 text-white";
  return "bg-secondary text-secondary-foreground";
}

function CollapsedListCard({ title, count, emptyText, children, pill }: { title: string; count: number; emptyText: string; children: React.ReactNode; pill?: "red" | "green" }) {
  const titleClass = "text-[10px] uppercase tracking-[0.2em] text-muted-foreground";
  const pillColor = pill === "green" ? "bg-emerald-600" : "bg-red-600";
  const countBadge = pill && count > 0
    ? <span className={`ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full ${pillColor} text-white text-[10px] normal-case tracking-normal font-bold align-middle`}>{count}</span>
    : <span className="text-foreground/70 normal-case tracking-normal font-normal">({count})</span>;
  return (
    <Card><CardContent className="p-4">
      {count === 0 ? (
        <>
          <div className={`${titleClass} mb-2`}>{title}</div>
          <div className="text-xs text-muted-foreground italic">{emptyText}</div>
        </>
      ) : (
        <Accordion type="multiple" defaultValue={[]}>
          <AccordionItem value="x" className="border-0">
            <AccordionTrigger className="hover:no-underline py-1">
              <span className={titleClass}>{title} {countBadge}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-1">{children}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </CardContent></Card>
  );
}

// Older analyses (before the schema merged facial/eye/head/hand into one paragraph and
// added energy_and_pace/personality_impression) still have their insights sitting under
// the old per-category field names -- normalize those into the current shape so nothing
// that was already generated disappears from the panel.
function normalizeBehavioralSignals(signals: any) {
  const legacyBits = [
    signals.facial_expressiveness?.observation,
    signals.eye_contact_and_gaze?.observation,
    signals.head_movement?.observation,
    signals.hand_gestures?.observation,
  ].filter(Boolean);
  const expression_summary = signals.expression_summary ?? (legacyBits.length ? legacyBits.join(" ") : undefined);
  const expression_flag = signals.expression_flag ?? [
    signals.facial_expressiveness?.flag, signals.eye_contact_and_gaze?.flag,
    signals.head_movement?.flag, signals.hand_gestures?.flag,
  ].some(Boolean);
  const energy_and_pace = signals.energy_and_pace ?? signals.movement_pace_and_symmetry;
  return { ...signals, expression_summary, expression_flag, energy_and_pace };
}

function BehavioralSignalsPanel({ interviewId, analysisId, signals: rawSignals, onDeleted }: {
  interviewId: string; analysisId: string; signals: any; onDeleted: () => void;
}) {
  const signals = normalizeBehavioralSignals(rawSignals);
  const videoUrl = useQuery({
    queryKey: ["iv-video-url", signals.video_path],
    queryFn: () => getInterviewVideoSignedUrl(signals.video_path),
    enabled: !!signals.video_path,
  });
  const del = useMutation({
    mutationFn: () => deleteBehavioralSignals(analysisId, signals.video_path),
    onSuccess: () => { toast.success("Video and behavioral signals removed"); onDeleted(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  return (
    <div className="mt-4 rounded-md border border-amber-300 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-amber-50 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-800">Behavioral signals · from uploaded video</div>
          <div className="text-xs text-amber-900/80 italic">AI-observed, descriptive only — not an assessment of honesty. Flags are prompts to ask more, never a verdict.</div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive shrink-0" onClick={() => del.mutate()} disabled={del.isPending}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Video
        </Button>
      </div>
      {signals.video_path && (
        <div className="px-4 pt-3">
          {videoUrl.data ? (
            <video controls src={videoUrl.data} className="w-full max-h-80 rounded-md bg-black" />
          ) : (
            <div className="text-xs text-muted-foreground italic">Loading video…</div>
          )}
        </div>
      )}
      <div className="px-4 py-3 space-y-3">
        {signals.expression_summary && (
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Facial, eye, head & hand expression</span>
              {signals.expression_flag && <Badge className="bg-amber-500 text-white text-[10px]">Worth probing</Badge>}
            </div>
            <div className="text-sm text-amber-900/80 italic mt-0.5">{signals.expression_summary}</div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {[
            ["Posture", signals.posture],
            ["Energy & pace", signals.energy_and_pace],
          ].map(([label, v]: any) => v && (
            <div key={label as string} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {v.flag && <Badge className="bg-amber-500 text-white text-[10px]">Worth probing</Badge>}
              </div>
              <div className="text-sm text-amber-900/80 italic mt-0.5">{v.observation}</div>
            </div>
          ))}
        </div>
        {signals.personality_impression && (
          <div className="text-sm">
            <span className="font-medium">Personality impression</span>
            <span className="text-[10px] text-muted-foreground not-italic ml-2">tentative, from this meeting only</span>
            <div className="text-sm text-amber-900/80 italic mt-0.5">{signals.personality_impression}</div>
          </div>
        )}
      </div>
      {signals.summary && (
        <div className="px-4 pb-4 text-sm text-amber-900/80 italic">{signals.summary}</div>
      )}
    </div>
  );
}

/* ---- Dedup + grouping helpers ---- */
function norm(s: any): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function jaccard(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = new Set(a.split(" ").filter(Boolean));
  const B = new Set(b.split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}
function anyJaccard(sig: string, others: string[], threshold: number): boolean {
  if (!sig) return false;
  return others.some((o) => o && jaccard(sig, o) >= threshold);
}
function dedupList<T>(items: T[], sigOf: (item: T) => string, textOf: (item: T) => string): T[] {
  const seen = new Map<string, { item: T; text: string }>();
  const order: string[] = [];
  for (const it of items) {
    const sig = sigOf(it);
    if (!sig) { order.push(`__k${order.length}`); seen.set(order[order.length - 1], { item: it, text: textOf(it) }); continue; }
    // exact hit
    if (seen.has(sig)) {
      const prev = seen.get(sig)!;
      const t = textOf(it);
      if (t.length > prev.text.length) seen.set(sig, { item: it, text: t });
      continue;
    }
    // near-dupe against existing sigs
    let matched: string | null = null;
    for (const k of order) {
      if (k.startsWith("__k")) continue;
      if (jaccard(sig, k) >= 0.8) { matched = k; break; }
    }
    if (matched) {
      const prev = seen.get(matched)!;
      const t = textOf(it);
      if (t.length > prev.text.length) seen.set(matched, { item: it, text: t });
      continue;
    }
    seen.set(sig, { item: it, text: textOf(it) });
    order.push(sig);
  }
  return order.map((k) => seen.get(k)!.item);
}
function ratingScore(r: any): number | null {
  if (r == null) return null;
  if (typeof r === "number") return r;
  const s = String(r).toLowerCase();
  if (s.startsWith("crit")) return 4;
  if (s.startsWith("high")) return 3;
  if (s.startsWith("med") || s.includes("moderate")) return 2;
  if (s.startsWith("low") || s === "minor") return 1;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
function scoreToLabel(n: number): string {
  if (n >= 3.5) return "Critical";
  if (n >= 2.5) return "High";
  if (n >= 1.5) return "Medium";
  return "Low";
}
function groupRisks(items: any[]): Array<{ category: string; items: any[]; avgLabel: string | null }> {
  const map = new Map<string, any[]>();
  for (const a of items) {
    const cat = a.payload?.category?.trim() || "Uncategorised";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(a);
  }
  return Array.from(map.entries()).map(([category, list]) => {
    const scores = list.map((a) => ratingScore(a.payload?.rating)).filter((n): n is number => n != null);
    const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
    return { category, items: list, avgLabel: avg != null ? scoreToLabel(avg) : null };
  });
}


function UtteranceRow({ u, onDelete }: { u: any; onDelete: () => void }) {
  return (
    <div className="border-b border-border last:border-0 py-2 group flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="font-mono text-muted-foreground">{fmt(u.ts_ms)}</span>
          <Badge variant="outline" className="text-[10px] py-0">{u.speaker}</Badge>
          {u.confidence != null && <span className="text-[11px] text-muted-foreground">conf {(u.confidence * 100).toFixed(0)}%</span>}
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{u.text}</p>
      </div>
      <button
        onClick={onDelete}
        title="Delete this line"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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

function ReportContent({ interviewId }: { interviewId: string }) {
  const report = useQuery({ queryKey: ["iv-report", interviewId], queryFn: () => getReport(interviewId) });

  if (report.isLoading) return <div className="p-10 text-muted-foreground">Loading memo…</div>;
  if (!report.data) return <div className="p-10 text-muted-foreground">No memo yet. Complete the interview to generate the summary.</div>;
  const r = report.data.body as any;
  return (
    <div className="space-y-6">
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
