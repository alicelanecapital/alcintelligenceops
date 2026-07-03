import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOpportunities, fetchOpportunityProfile, updateOpportunityScreening } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/opportunities/")({
  component: () => <AppShell><OpportunitiesList /></AppShell>,
});

const SCREENING_OUTCOMES = ["Decline", "Observe", "Request Evidence", "Diagnostic", "Diligence"] as const;
const MESS_BADGE_CLASS: Record<string, string> = {
  Green: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Amber: "bg-amber-100 text-amber-800 border-amber-300",
  Red: "bg-red-100 text-red-800 border-red-300",
  Black: "bg-neutral-900 text-white border-neutral-900",
  Strategic: "bg-primary/10 text-primary border-primary/30",
};

function OpportunitiesList() {
  const q = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunities });
  const list = q.data ?? [];
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);

  const filtered = outcomeFilter
    ? list.filter((o: any) => (outcomeFilter === "Not screened" ? !o.screening_outcome : o.screening_outcome === outcomeFilter))
    : list;

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="Pipeline" title="Opportunities" description="Discrete investment opportunities. A founder can have several over time." />

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" variant={outcomeFilter === null ? "default" : "outline"} onClick={() => setOutcomeFilter(null)}>All</Button>
        <Button size="sm" variant={outcomeFilter === "Not screened" ? "default" : "outline"} onClick={() => setOutcomeFilter("Not screened")}>Not screened</Button>
        {SCREENING_OUTCOMES.map(o => (
          <Button key={o} size="sm" variant={outcomeFilter === o ? "default" : "outline"} onClick={() => setOutcomeFilter(o)}>{o}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center"><Target className="h-6 w-6 mx-auto mb-2" />No opportunities match this filter.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o: any) => (
            <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }}>
              <Card className="hover:border-primary/50 transition-colors"><CardContent className="p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-serif text-lg">{o.name}</div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="outline">{o.current_stage}</Badge>
                    {o.mess_classification && <Badge className={cn("border", MESS_BADGE_CLASS[o.mess_classification])}>{o.mess_classification} mess</Badge>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{o.founder?.name ?? "—"} · {o.company?.name ?? ""}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Priority · {o.priority}</div>
                  <div>Probability · {o.probability ?? "—"}%</div>
                </div>
                {o.screening_outcome && <Badge variant="outline" className="mt-2">Screening · {o.screening_outcome}</Badge>}
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function OpportunityProfile() {
  const { id } = useParams({ from: "/opportunities/$id" });
  const q = useQuery({ queryKey: ["opportunity", id], queryFn: () => fetchOpportunityProfile(id) });
  if (q.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (q.error || !q.data) return <div className="p-10 text-destructive">Could not load.</div>;
  const { opportunity, meetings, notes, tasks, documents } = q.data;
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <Link to="/opportunities" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-3 w-3" />Opportunities</Link>
      <Card><CardContent className="p-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Opportunity</div>
        <h1 className="font-serif text-3xl">{opportunity.name}</h1>
        <div className="text-sm text-muted-foreground mt-1">{opportunity.founder?.name} · {opportunity.company?.name}</div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline">{opportunity.current_stage}</Badge>
          {opportunity.priority && <Badge variant="outline">Priority · {opportunity.priority}</Badge>}
          {opportunity.assigned_partner && <Badge variant="outline">Partner · {opportunity.assigned_partner}</Badge>}
          {opportunity.estimated_investment && <Badge variant="outline">R{Number(opportunity.estimated_investment).toLocaleString()}</Badge>}
          {opportunity.mess_classification && <Badge className={cn("border", MESS_BADGE_CLASS[opportunity.mess_classification])}>{opportunity.mess_classification} mess</Badge>}
          {opportunity.screening_outcome && <Badge variant="outline">Screening · {opportunity.screening_outcome}</Badge>}
        </div>
      </CardContent></Card>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1">
          {["overview","screening","meetings","documents","notes","tasks","risks","value","committee","timeline","investments"].map(t => <TabsTrigger key={t} value={t} className="capitalize text-xs">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview">
          <Card><CardContent className="p-4 text-sm">{opportunity.summary ?? "No summary yet."}</CardContent></Card>
        </TabsContent>
        <TabsContent value="screening"><ScreeningTab opportunity={opportunity} opportunityId={id} /></TabsContent>
        <TabsContent value="meetings"><Simple items={meetings} render={(m: any) => `${m.title ?? "Meeting"} — ${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : ""}`} /></TabsContent>
        <TabsContent value="documents"><Simple items={documents} render={(d: any) => `${d.title ?? d.file_name}`} /></TabsContent>
        <TabsContent value="notes"><Simple items={notes} render={(n: any) => n.body} /></TabsContent>
        <TabsContent value="tasks"><Simple items={tasks} render={(t: any) => `${t.title} · ${t.status}`} /></TabsContent>
        {["risks","value","committee","timeline","investments"].map(t => (
          <TabsContent key={t} value={t}><Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{t.toUpperCase()} — coming soon.</CardContent></Card></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

const MESS_CLASSIFICATIONS = ["Green", "Amber", "Red", "Black", "Strategic"] as const;

const INVESTMENT_CRITERIA = [
  { key: "sa_business", label: "South African business, operating in SA" },
  { key: "founder_led_trading", label: "Founder-led / owner-managed, already trading" },
  { key: "real_customers", label: "Real customers and evidence of demand" },
  { key: "revenue_fit", label: "Annual revenue up to ~R2 million" },
  { key: "cheque_fit", label: "R100,000–R500,000 cheque fits the need" },
  { key: "accepts_guardrails", label: "Founder accepts guardrails, reporting, visibility" },
  { key: "use_of_funds_clear", label: "Clear use of funds and value creation path" },
] as const;

const SCREENING_STEPS = [
  "Basic fit — operating in South Africa",
  "Revenue and cash flow evidence",
  "Profit quality after normalising costs",
  "Founder test — honest, forthcoming, coachable",
  "Mess classification — acceptable, conditional, fatal, criminal",
  "Capital fit — can R100k–R500k move the business?",
  "Opportunity sizing — value, dividend or exit potential",
] as const;

function ScreeningTab({ opportunity, opportunityId }: { opportunity: any; opportunityId: string }) {
  const qc = useQueryClient();
  const [mess, setMess] = useState<string>(opportunity.mess_classification ?? "");
  const [messNotes, setMessNotes] = useState<string>(opportunity.mess_notes ?? "");
  const [step, setStep] = useState<number>(opportunity.screening_step ?? 0);
  const [outcome, setOutcome] = useState<string>(opportunity.screening_outcome ?? "");
  const [outcomeReason, setOutcomeReason] = useState<string>(opportunity.screening_outcome_reason ?? "");
  const [criteria, setCriteria] = useState<Record<string, boolean>>(opportunity.investment_criteria ?? {});

  const saveMut = useMutation({
    mutationFn: () => updateOpportunityScreening(opportunityId, {
      mess_classification: mess || null,
      mess_notes: messNotes || null,
      screening_step: step,
      screening_outcome: outcome || null,
      screening_outcome_reason: outcomeReason || null,
      investment_criteria: criteria,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-8">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Mess Classification</div>
          <div className="flex flex-wrap gap-2">
            {MESS_CLASSIFICATIONS.map(m => (
              <Button key={m} type="button" size="sm" variant={mess === m ? "default" : "outline"} onClick={() => setMess(m)}>{m}</Button>
            ))}
          </div>
          <Textarea className="mt-3" rows={2} placeholder="Notes on the mess and whether it's fixable…" value={messNotes} onChange={e => setMessNotes(e.target.value)} />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Investment Criteria — Core Eligibility</div>
          <div className="space-y-2">
            {INVESTMENT_CRITERIA.map(c => (
              <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={!!criteria[c.key]} onCheckedChange={(v) => setCriteria(s => ({ ...s, [c.key]: !!v }))} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">7-Step Screening</div>
          <div className="space-y-1.5">
            {SCREENING_STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(step === i + 1 ? i : i + 1)}
                className={cn(
                  "w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                  i < step ? "text-foreground" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span className={cn(
                  "h-4 w-4 rounded-full border shrink-0 flex items-center justify-center text-[9px]",
                  i < step ? "bg-primary border-primary text-primary-foreground" : "border-border",
                )}>{i < step ? "✓" : ""}</span>
                {i + 1}. {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Screening Outcome</div>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder="Select outcome…" /></SelectTrigger>
              <SelectContent>
                {SCREENING_OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Reason</div>
            <Textarea rows={1} value={outcomeReason} onChange={e => setOutcomeReason(e.target.value)} placeholder="Why this outcome…" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save screening"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Simple({ items, render }: { items: any[]; render: (x: any) => string }) {
  if (!items.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nothing here yet.</CardContent></Card>;
  return <div className="space-y-2">{items.map(x => <Card key={x.id}><CardContent className="p-3 text-sm">{render(x)}</CardContent></Card>)}</div>;
}
