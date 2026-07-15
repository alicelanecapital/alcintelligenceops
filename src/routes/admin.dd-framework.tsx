import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllFrameworkRounds, fetchFrameworkRoundDetail, updateFrameworkRound,
  createFrameworkQuestion, updateFrameworkQuestion, deleteFrameworkQuestion, reorderFrameworkQuestions,
  createFrameworkDocument, updateFrameworkDocument, deleteFrameworkDocument, reorderFrameworkDocuments,
  type FrameworkQuestion, type FrameworkDocument, type FrameworkRedFlag,
} from "@/lib/dd-framework-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RoundStepper } from "@/components/RoundStepper";
import { Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dd-framework")({ component: () => <AppShell><DDFrameworkAdmin /></AppShell> });

const SEVERITIES: FrameworkRedFlag["severity"][] = ["WALK_AWAY", "PRICE_IT_IN", "MONITOR"];
const SEVERITY_COLORS: Record<string, string> = {
  WALK_AWAY: "bg-red-100 text-red-800",
  PRICE_IT_IN: "bg-orange-100 text-orange-800",
  MONITOR: "bg-amber-100 text-amber-800",
};

function DDFrameworkAdmin() {
  const [round, setRound] = useState(1);
  const qc = useQueryClient();
  const rounds = useQuery({ queryKey: ["dd-framework-rounds"], queryFn: fetchAllFrameworkRounds });
  const q = useQuery({ queryKey: ["dd-framework-round", round], queryFn: () => fetchFrameworkRoundDetail(round) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dd-framework-round", round] });
    qc.invalidateQueries({ queryKey: ["dd-framework-rounds"] });
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="DD Framework"
        description="Adjust the questions, guidance, and required documents for each due diligence round."
      />

      <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
        <aside className="sticky top-4 shrink-0">
          <RoundStepper
            rounds={(rounds.data ?? [1, 2, 3, 4, 5].map((r) => ({ round: r, title: `Round ${r}`, subtitle: null }))).map((r: any) => ({ round: r.round, title: r.title, subtitle: r.subtitle }))}
            current={round}
            onSelect={setRound}
          />
        </aside>

        <div className="min-w-0">
          {q.data && (
            <>
              <RoundMetaCard round={q.data.round} onSaved={invalidate} />
              <QuestionsSection round={round} questions={q.data.questions} onChanged={invalidate} />
              <DocumentsSection round={round} documents={q.data.documents} onChanged={invalidate} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RoundMetaCard({ round, onSaved }: { round: { round: number; title: string; subtitle: string | null; purpose: string | null; duration: string | null }; onSaved: () => void }) {
  const [title, setTitle] = useState(round.title);
  const [subtitle, setSubtitle] = useState(round.subtitle ?? "");
  const [purpose, setPurpose] = useState(round.purpose ?? "");
  const [duration, setDuration] = useState(round.duration ?? "");

  useEffect(() => {
    setTitle(round.title); setSubtitle(round.subtitle ?? ""); setPurpose(round.purpose ?? ""); setDuration(round.duration ?? "");
  }, [round]);

  const m = useMutation({
    mutationFn: () => updateFrameworkRound(round.round, { title, subtitle, purpose, duration }),
    onSuccess: () => { toast.success("Round details saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle className="font-serif text-xl">Round details</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-sm">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-sm">Subtitle</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">Purpose</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}><Save className="h-3.5 w-3.5 mr-1" /> Save round details</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionsSection({ round, questions, onChanged }: { round: number; questions: FrameworkQuestion[]; onChanged: () => void }) {
  const addMut = useMutation({
    mutationFn: () => createFrameworkQuestion(round, questions.length + 1),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to add question"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFrameworkQuestion(id),
    onSuccess: () => { toast.success("Question removed"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove question"),
  });
  const reorderMut = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) => reorderFrameworkQuestions(items),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to reorder"),
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index], b = questions[target];
    reorderMut.mutate([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }]);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-2xl">Questions ({questions.length})</h2>
        <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}><Plus className="h-3.5 w-3.5 mr-1" /> Add question</Button>
      </div>
      <div className="space-y-3">
        {questions.map((question, idx) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={idx}
            total={questions.length}
            onMove={(dir) => move(idx, dir)}
            onDelete={() => deleteMut.mutate(question.id)}
            onSaved={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ question, index, total, onMove, onDelete, onSaved }: {
  question: FrameworkQuestion; index: number; total: number; onMove: (dir: -1 | 1) => void; onDelete: () => void; onSaved: () => void;
}) {
  const [questionText, setQuestionText] = useState(question.question_text);
  const [whyText, setWhyText] = useState(question.why_text ?? "");
  const [internalSteps, setInternalSteps] = useState((question.internal_steps ?? []).join("\n"));
  const [redFlags, setRedFlags] = useState<FrameworkRedFlag[]>(question.red_flags ?? []);

  const m = useMutation({
    mutationFn: () => updateFrameworkQuestion(question.id, {
      question_text: questionText,
      why_text: whyText,
      internal_steps: internalSteps.split("\n").map((s) => s.trim()).filter(Boolean),
      red_flags: redFlags,
    }),
    onSuccess: () => { toast.success("Question saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save question"),
  });

  const updateFlag = (i: number, patch: Partial<FrameworkRedFlag>) => {
    setRedFlags((flags) => flags.map((f, fi) => (fi === i ? { ...f, ...patch } : f)));
  };
  const removeFlag = (i: number) => setRedFlags((flags) => flags.filter((_, fi) => fi !== i));
  const addFlag = () => setRedFlags((flags) => [...flags, { text: "", severity: "MONITOR" }]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground mt-2">Q{index + 1}</span>
          <div className="flex-1 space-y-3">
            <div>
              <Label className="text-xs">Question</Label>
              <Input value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Why this matters</Label>
              <textarea className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm bg-background mt-1" value={whyText} onChange={(e) => setWhyText(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Internal verification steps (one per line)</Label>
              <textarea className="w-full min-h-[50px] px-3 py-2 border rounded-md text-sm bg-background mt-1" value={internalSteps} onChange={(e) => setInternalSteps(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Red flags</Label>
                <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" onClick={addFlag}><Plus className="h-3 w-3 mr-1" /> Add flag</Button>
              </div>
              <div className="space-y-2 mt-1">
                {redFlags.map((flag, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={flag.text} onChange={(e) => updateFlag(i, { text: e.target.value })} className="flex-1 h-8 text-xs" />
                    <select
                      className="h-8 px-2 border rounded-md text-xs bg-background"
                      value={flag.severity}
                      onChange={(e) => updateFlag(i, { severity: e.target.value as FrameworkRedFlag["severity"] })}
                    >
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Badge className={`${SEVERITY_COLORS[flag.severity]} border-0 text-[10px] whitespace-nowrap`}>{flag.severity}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeFlag(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}><Save className="h-3.5 w-3.5 mr-1" /> Save question</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ round, documents, onChanged }: { round: number; documents: FrameworkDocument[]; onChanged: () => void }) {
  const addMut = useMutation({
    mutationFn: () => createFrameworkDocument(round, documents.length + 1),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to add document"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFrameworkDocument(id),
    onSuccess: () => { toast.success("Document removed"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove document"),
  });
  const reorderMut = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) => reorderFrameworkDocuments(items),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to reorder"),
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= documents.length) return;
    const a = documents[index], b = documents[target];
    reorderMut.mutate([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-2xl">Required documents ({documents.length})</h2>
        <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}><Plus className="h-3.5 w-3.5 mr-1" /> Add document</Button>
      </div>
      <div className="space-y-3">
        {documents.map((doc, idx) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            index={idx}
            total={documents.length}
            onMove={(dir) => move(idx, dir)}
            onDelete={() => deleteMut.mutate(doc.id)}
            onSaved={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ doc, index, total, onMove, onDelete, onSaved }: {
  doc: FrameworkDocument; index: number; total: number; onMove: (dir: -1 | 1) => void; onDelete: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(doc.name);
  const [purpose, setPurpose] = useState(doc.purpose ?? "");

  const m = useMutation({
    mutationFn: () => updateFrameworkDocument(doc.id, { name, purpose }),
    onSuccess: () => { toast.success("Document saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save document"),
  });

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Document name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Purpose</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown className="h-4 w-4" /></Button>
        </div>
        <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </CardContent>
    </Card>
  );
}
