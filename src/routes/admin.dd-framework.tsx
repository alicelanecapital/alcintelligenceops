import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllFrameworkRounds, fetchFrameworkRoundDetail, updateFrameworkRound,
  createFrameworkRound, deleteFrameworkRound, reorderFrameworkRounds,
  createFrameworkQuestion, updateFrameworkQuestion, deleteFrameworkQuestion, reorderFrameworkQuestions,
  createFrameworkDocument, updateFrameworkDocument, deleteFrameworkDocument, reorderFrameworkDocuments,
  type FrameworkQuestion, type FrameworkDocument, type FrameworkRedFlag,
} from "@/lib/dd-framework-admin";
// Card frames removed from admin — sections use dividers only.
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/dd-framework")({ component: () => <AppShell><DDFrameworkAdmin /></AppShell> });

const SEVERITIES: FrameworkRedFlag["severity"][] = ["WALK_AWAY", "PRICE_IT_IN", "MONITOR"];
// Distinctly different hues (not adjacent on the colour wheel) so severities are never
// mistaken for one another at a glance -- amber/orange previously looked too similar.
const SEVERITY_COLORS: Record<string, string> = {
  WALK_AWAY: "bg-red-100 text-red-800",
  PRICE_IT_IN: "bg-orange-100 text-orange-800",
  MONITOR: "bg-blue-100 text-blue-800",
};

function DDFrameworkAdmin() {
  const qc = useQueryClient();
  const rounds = useQuery({ queryKey: ["dd-framework-rounds"], queryFn: fetchAllFrameworkRounds });
  const [expanded, setExpanded] = useState<string[]>([]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dd-framework-rounds"] });
    for (const v of expanded) {
      const num = Number(v.replace("round-", ""));
      if (!Number.isNaN(num)) qc.invalidateQueries({ queryKey: ["dd-framework-round", num] });
    }
  };

  const addRoundMut = useMutation({
    mutationFn: () => createFrameworkRound(),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["dd-framework-rounds"] });
      setExpanded((prev) => Array.from(new Set([...prev, `round-${created.round}`])));
      toast.success(`Round ${created.round} added`);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add round"),
  });

  const deleteRoundMut = useMutation({
    mutationFn: (r: number) => deleteFrameworkRound(r),
    onSuccess: (_data, deletedRound) => {
      qc.invalidateQueries({ queryKey: ["dd-framework-rounds"] });
      setExpanded((prev) => prev.filter((v) => v !== `round-${deletedRound}`));
      toast.success(`Round ${deletedRound} deleted`);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete round"),
  });

  const list = (rounds.data ?? []) as any[];

  const handleReorder = (newOrder: { round: number; title: string; subtitle?: string | null }[]) => {
    const payload = newOrder.map((r, idx) => ({ round: r.round, sort_order: idx + 1 }));
    qc.setQueryData(["dd-framework-rounds"], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      const byRound = new Map(prev.map((r: any) => [r.round, r]));
      return payload.map((p) => ({ ...(byRound.get(p.round) as any), sort_order: p.sort_order }));
    });
    reorderFrameworkRounds(payload)
      .then(() => {
        toast.success("Round order saved");
        qc.invalidateQueries({ queryKey: ["dd-framework-rounds"] });
      })
      .catch((e: any) => {
        toast.error(e?.message ?? "Failed to save order");
        qc.invalidateQueries({ queryKey: ["dd-framework-rounds"] });
      });
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="DD Intelligence Engine"
        description="Adjust the questions, guidance, and required documents for each due diligence round."
      />

      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" onClick={() => addRoundMut.mutate()} disabled={addRoundMut.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Round
        </Button>
      </div>

      <SortableRoundAccordion
        rounds={list.map((r) => ({ round: r.round, title: r.title, subtitle: r.subtitle }))}
        expanded={expanded}
        onExpandedChange={setExpanded}
        onReorder={handleReorder}
        onDelete={(r) => deleteRoundMut.mutate(r)}
        canDelete={list.length > 1}
        onInvalidate={invalidate}
      />
    </div>
  );
}

function SortableRoundAccordion({
  rounds, expanded, onExpandedChange, onReorder, onDelete, canDelete, onInvalidate,
}: {
  rounds: { round: number; title: string; subtitle?: string | null }[];
  expanded: string[];
  onExpandedChange: (v: string[]) => void;
  onReorder: (r: { round: number; title: string; subtitle?: string | null }[]) => void;
  onDelete: (round: number) => void;
  canDelete: boolean;
  onInvalidate: () => void;
}) {
  return (
    <DndContext
      sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))}
      collisionDetection={closestCenter}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = rounds.findIndex((r) => String(r.round) === String(active.id));
        const newIndex = rounds.findIndex((r) => String(r.round) === String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        onReorder(arrayMove(rounds, oldIndex, newIndex));
      }}
    >
      <SortableContext items={rounds.map((r) => String(r.round))} strategy={verticalListSortingStrategy}>
        <Accordion type="multiple" value={expanded} onValueChange={onExpandedChange} className="space-y-2">
          {rounds.map((r, idx) => (
            <SortableRoundItem
              key={r.round}
              round={r}
              index={idx}
              canDelete={canDelete}
              onDelete={() => onDelete(r.round)}
              onInvalidate={onInvalidate}
              isExpanded={expanded.includes(`round-${r.round}`)}
            />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}

function SortableRoundItem({
  round, index, canDelete, onDelete, onInvalidate, isExpanded,
}: {
  round: { round: number; title: string; subtitle?: string | null };
  index: number;
  canDelete: boolean;
  onDelete: () => void;
  onInvalidate: () => void;
  isExpanded: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(round.round) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={`round-${round.round}`} className="border border-border rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted/30">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border shrink-0">
            {index + 1}
          </span>
          <AccordionTrigger className="flex-1 hover:no-underline py-2 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{round.title}</span>
              {round.subtitle && <span className="block text-xs text-muted-foreground truncate">{round.subtitle}</span>}
            </span>
          </AccordionTrigger>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" title="Delete round">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Round {round.round}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes Round {round.round}'s questions and required documents. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <AccordionContent>
          <div className="px-4 pt-4">
            {isExpanded && <RoundBody round={round.round} onInvalidate={onInvalidate} />}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

function RoundBody({ round, onInvalidate }: { round: number; onInvalidate: () => void }) {
  const q = useQuery({
    queryKey: ["dd-framework-round", round],
    queryFn: () => fetchFrameworkRoundDetail(round),
  });

  if (q.isLoading || !q.data) return <p className="text-sm text-muted-foreground py-3">Loading…</p>;

  return (
    <>
      <RoundMetaCard round={q.data.round} onSaved={onInvalidate} />
      <QuestionsSection round={round} questions={q.data.questions} onChanged={onInvalidate} />
      <DocumentsSection round={round} documents={q.data.documents} onChanged={onInvalidate} />
    </>
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
    <div className="mb-6 pb-6 border-b border-border">
      <h2 className="font-serif text-xl mb-3">Round details</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_160px] gap-3">
          <div>
            <Label className="text-sm">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-sm">Subtitle</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-sm">Purpose</Label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full min-h-[90px] px-3 py-2 border rounded-md text-sm bg-background mt-1"
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}><Save className="h-3.5 w-3.5 mr-1" /> Save round details</Button>
        </div>
      </div>
    </div>
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
        <h2 className="font-serif text-2xl">Questions</h2>
        <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}><Plus className="h-3.5 w-3.5 mr-1" /> Add question</Button>
      </div>
      <Accordion type="multiple" className="divide-y divide-border">
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
      </Accordion>
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
    <AccordionItem value={question.id}>
      <AccordionTrigger className="text-sm">
        <span className="text-left">{questionText || `Question ${index + 1}`}</span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex items-start justify-between gap-2">
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
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}><Save className="h-3.5 w-3.5 mr-1" /> Save question</Button>
        </div>
      </AccordionContent>
    </AccordionItem>
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
      <div className="divide-y divide-border border-t border-border">
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
    <div className="py-3 flex items-center gap-3">
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
    </div>
  );
}
