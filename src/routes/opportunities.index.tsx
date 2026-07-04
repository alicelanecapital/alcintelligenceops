import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOpportunities, fetchOpportunityProfile, updateOpportunityScreening, updateOpportunityDiagnostic, updateOpportunityDiligence, updateOpportunityStructuring, updateOpportunityHundredDayPlan, updateOpportunityGovernance } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Target, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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
          {opportunity.diagnostic_score != null && <Badge variant="outline">Diagnostic · {opportunity.diagnostic_score}/5</Badge>}
          {opportunity.diligence_stop_points && Object.values(opportunity.diligence_stop_points).some(Boolean) && (
            <Badge className="bg-destructive text-destructive-foreground border-destructive">Stop point triggered</Badge>
          )}
          {opportunity.diligence_recommendation && <Badge variant="outline">Diligence · {opportunity.diligence_recommendation}</Badge>}
          {opportunity.proposed_instrument && <Badge variant="outline">{opportunity.proposed_instrument}</Badge>}
          {opportunity.valuation_amount && <Badge variant="outline">Valuation R{Number(opportunity.valuation_amount).toLocaleString()}</Badge>}
        </div>
      </CardContent></Card>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1">
          {["overview","screening","diagnostic","diligence","structuring","hundred-day","governance","meetings","documents","notes","tasks","risks","value","committee","timeline","investments"].map(t => <TabsTrigger key={t} value={t} className="capitalize text-xs">{t.replace("-"," ")}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview">
          <Card><CardContent className="p-4 text-sm">{opportunity.summary ?? "No summary yet."}</CardContent></Card>
        </TabsContent>
        <TabsContent value="screening"><ScreeningTab opportunity={opportunity} opportunityId={id} /></TabsContent>
        <TabsContent value="diagnostic"><DiagnosticTab opportunity={opportunity} opportunityId={id} /></TabsContent>
        <TabsContent value="diligence"><DiligenceTab opportunity={opportunity} opportunityId={id} /></TabsContent>
        <TabsContent value="structuring"><StructuringTab opportunity={opportunity} opportunityId={id} /></TabsContent>
        <TabsContent value="hundred-day"><HundredDayPlanTab opportunity={opportunity} opportunityId={id} /></TabsContent>
        <TabsContent value="governance"><GovernanceTab opportunity={opportunity} opportunityId={id} /></TabsContent>
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

const REVENUE_QUALITY_RATINGS = [
  { value: "A", label: "A: Durable — repeat customers, low volatility" },
  { value: "B", label: "B: Promising — strong demand, still variable" },
  { value: "C", label: "C: Fragile — concentrated, seasonal, founder-dependent" },
  { value: "D", label: "D: Unproven — cannot be verified or repeated" },
];

const PROFIT_QUALITY_RATINGS = [
  { value: "Clean profit", label: "Clean profit — attractive after normalising costs" },
  { value: "Hidden profit", label: "Hidden profit — real but obscured by poor records" },
  { value: "Inflated profit", label: "Inflated profit — strong only because costs excluded" },
  { value: "False profit", label: "False profit — disappears with proper costs" },
];

const DIAGNOSTIC_FREE_TEXT_CATEGORIES = [
  { key: "cash_discipline", label: "Cash Discipline", question: "Can cash be tracked and protected?" },
  { key: "debt_obligations", label: "Debt & Obligations", question: "What claims exist on future cash flow?" },
  { key: "tax_vat_readiness", label: "Tax/VAT Readiness", question: "What compliance obligations are approaching or unresolved?" },
  { key: "founder_dependency", label: "Founder Dependency", question: "Can the business operate beyond founder heroics?" },
  { key: "operational_maturity", label: "Operational Maturity", question: "Are systems sufficient for growth?" },
  { key: "capital_fit", label: "Capital Fit", question: "Will R100k–R500k change trajectory?" },
  { key: "value_creation_path", label: "Value Creation Path", question: "What are the highest leverage improvements?" },
] as const;

const DIAGNOSTIC_RECOMMENDATIONS = ["Decline", "Observe", "Diligence", "Invest subject to conditions"] as const;

function DiagnosticTab({ opportunity, opportunityId }: { opportunity: any; opportunityId: string }) {
  const qc = useQueryClient();
  const existing = opportunity.diagnostic ?? {};
  const [revenueRating, setRevenueRating] = useState(existing.revenue_quality?.rating ?? "");
  const [revenueEvidence, setRevenueEvidence] = useState(existing.revenue_quality?.evidence ?? "");
  const [profitRating, setProfitRating] = useState(existing.profit_quality?.rating ?? "");
  const [profitNotes, setProfitNotes] = useState(existing.profit_quality?.notes ?? "");
  const [freeText, setFreeText] = useState<Record<string, string>>(() =>
    Object.fromEntries(DIAGNOSTIC_FREE_TEXT_CATEGORIES.map(c => [c.key, existing[c.key]?.notes ?? ""])),
  );
  const [score, setScore] = useState<number | null>(opportunity.diagnostic_score ?? null);
  const [recommendation, setRecommendation] = useState<string>(opportunity.diagnostic_recommendation ?? "");
  const [summary, setSummary] = useState<string>(opportunity.diagnostic_summary ?? "");

  const saveMut = useMutation({
    mutationFn: () => updateOpportunityDiagnostic(opportunityId, {
      diagnostic: {
        revenue_quality: { rating: revenueRating, evidence: revenueEvidence },
        profit_quality: { rating: profitRating, notes: profitNotes },
        ...Object.fromEntries(DIAGNOSTIC_FREE_TEXT_CATEGORIES.map(c => [c.key, { notes: freeText[c.key] }])),
      },
      diagnostic_score: score,
      diagnostic_recommendation: recommendation || null,
      diagnostic_summary: summary || null,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Revenue Quality</div>
            <Select value={revenueRating} onValueChange={setRevenueRating}>
              <SelectTrigger><SelectValue placeholder="Select rating…" /></SelectTrigger>
              <SelectContent>{REVENUE_QUALITY_RATINGS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea className="mt-2" rows={2} placeholder="Evidence…" value={revenueEvidence} onChange={e => setRevenueEvidence(e.target.value)} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Profit Quality</div>
            <Select value={profitRating} onValueChange={setProfitRating}>
              <SelectTrigger><SelectValue placeholder="Select rating…" /></SelectTrigger>
              <SelectContent>{PROFIT_QUALITY_RATINGS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea className="mt-2" rows={2} placeholder="Notes…" value={profitNotes} onChange={e => setProfitNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          {DIAGNOSTIC_FREE_TEXT_CATEGORIES.map(c => (
            <div key={c.key}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{c.label} <span className="normal-case text-muted-foreground/70">— {c.question}</span></div>
              <Textarea rows={2} value={freeText[c.key]} onChange={e => setFreeText(s => ({ ...s, [c.key]: e.target.value }))} />
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Diagnostic Score (§8.4)</div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setScore(n)} className={cn(
                  "h-8 w-8 rounded-full border text-xs flex items-center justify-center transition-colors",
                  score === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50",
                )}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Recommendation</div>
            <Select value={recommendation} onValueChange={setRecommendation}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{DIAGNOSTIC_RECOMMENDATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">One-Page Business Summary (§8.5)</div>
          <Textarea rows={4} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Revenue quality, profit quality, founder dependency, mess classification, capital-fit conclusion, top five value creation levers, key diligence questions…" />
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save diagnostic"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

const STOP_POINTS = [
  { key: "founder_lied", label: "Founder lies during diligence" },
  { key: "revenue_unverifiable", label: "Revenue cannot be verified in any reasonable way" },
  { key: "undisclosed_debt", label: "Undisclosed debt materially changes the business picture" },
  { key: "illegal_profitability", label: "Profitability depends on illegal or abusive practices" },
  { key: "refuses_visibility", label: "Founder refuses financial visibility" },
  { key: "liabilities_exceed_recovery", label: "Liabilities exceed the ability of the business to recover" },
  { key: "funds_old_holes", label: "Capital will mainly fund old holes without a credible reset" },
] as const;

const DILIGENCE_AREAS = [
  { key: "legal_existence", label: "Legal existence", items: "Registration, ownership, directors, trading name, licences", question: "Who owns and controls the business?" },
  { key: "founder_identity", label: "Founder identity", items: "ID, address, background, business history, references", question: "Is the founder who they say they are?" },
  { key: "banking", label: "Banking", items: "6–12 months statements, all business accounts", question: "Can cash flow be reconstructed?" },
  { key: "revenue", label: "Revenue", items: "Card statements, invoices, receipts, cash logs", question: "Is revenue real and repeatable?" },
  { key: "costs", label: "Costs", items: "Rent, wages, suppliers, utilities, repairs", question: "What does the business truly cost to run?" },
  { key: "owner_drawings", label: "Owner drawings", items: "Salary, drawings, personal expenses, family payments", question: "What is true business profit?" },
  { key: "debt", label: "Debt", items: "Loans, merchant advances, family/friend debt, repayment terms", question: "What claims exist on future cash flow?" },
  { key: "tax_vat", label: "Tax/VAT", items: "Registration, SARS status, VAT threshold, arrears", question: "Is there a quantifiable compliance exposure?" },
  { key: "staff", label: "Staff", items: "Employee list, pay, hours, obligations, disputes", question: "Are labour obligations understood?" },
  { key: "customers", label: "Customers", items: "Repeat customers, concentration, contracts, reviews", question: "How durable is demand?" },
  { key: "suppliers", label: "Suppliers", items: "Key suppliers, terms, arrears, alternatives", question: "Can the business keep operating smoothly?" },
  { key: "assets", label: "Assets", items: "Equipment, stock, vehicles, ownership, condition", question: "What assets exist and who owns them?" },
  { key: "premises", label: "Premises", items: "Lease, rent arrears, renewal risk", question: "Can the business keep trading from its base?" },
  { key: "compliance", label: "Compliance", items: "Permits, health/safety, insurance, licences", question: "Could regulation shut the business down?" },
  { key: "disputes", label: "Disputes", items: "Legal claims, landlord issues, staff disputes", question: "Are there hidden liabilities?" },
  { key: "use_of_funds", label: "Use of funds", items: "Budget, milestones, expected impact", question: "Will the cheque change the business?" },
] as const;

const DILIGENCE_STATUSES = ["Not started", "In progress", "Reviewed", "Flagged"] as const;
const DILIGENCE_RECOMMENDATIONS = ["Decline", "Proceed", "Invest subject to conditions"] as const;

const DILIGENCE_OUTPUT_FIELDS = [
  { key: "verified_revenue_estimate", label: "Verified revenue estimate" },
  { key: "normalised_profit_estimate", label: "Normalised profit estimate" },
  { key: "debt_liabilities_schedule", label: "Debt & liabilities schedule" },
  { key: "tax_vat_exposure_note", label: "Tax/VAT exposure note" },
  { key: "founder_integrity_assessment", label: "Founder integrity assessment" },
  { key: "guardrails_required", label: "Guardrails required" },
  { key: "valuation_range", label: "Valuation range" },
  { key: "proposed_structure", label: "Proposed structure" },
] as const;

function DiligenceTab({ opportunity, opportunityId }: { opportunity: any; opportunityId: string }) {
  const qc = useQueryClient();
  const [stopPoints, setStopPoints] = useState<Record<string, boolean>>(opportunity.diligence_stop_points ?? {});
  const [checklist, setChecklist] = useState<Record<string, { status?: string; notes?: string }>>(opportunity.diligence_checklist ?? {});
  const [output, setOutput] = useState<Record<string, string>>(opportunity.diligence_output ?? {});
  const [recommendation, setRecommendation] = useState<string>(opportunity.diligence_recommendation ?? "");

  const anyStopPoint = Object.values(stopPoints).some(Boolean);

  const saveMut = useMutation({
    mutationFn: () => updateOpportunityDiligence(opportunityId, {
      diligence_stop_points: stopPoints,
      diligence_checklist: checklist,
      diligence_output: output,
      diligence_recommendation: recommendation || null,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  return (
    <div className="space-y-6">
      <Card className={cn(anyStopPoint && "border-destructive")}>
        <CardContent className="p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Automatic Stop Points (§9.3)</div>
          {anyStopPoint && <div className="text-sm font-medium text-destructive mb-3">Stop point triggered — default is decline.</div>}
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {STOP_POINTS.map(sp => (
              <label key={sp.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={!!stopPoints[sp.key]} onCheckedChange={(v) => setStopPoints(s => ({ ...s, [sp.key]: !!v }))} />
                {sp.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">15-Area Checklist (§9.2)</div>
          <div className="space-y-4">
            {DILIGENCE_AREAS.map(a => {
              const row = checklist[a.key] ?? {};
              return (
                <div key={a.key} className="grid sm:grid-cols-[160px_1fr_160px] gap-3 items-start border-b border-border last:border-0 pb-4 last:pb-0">
                  <div>
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.items}</div>
                    <div className="text-xs text-muted-foreground italic mt-0.5">{a.question}</div>
                  </div>
                  <Textarea rows={2} placeholder="Notes…" value={row.notes ?? ""} onChange={e => setChecklist(s => ({ ...s, [a.key]: { ...s[a.key], notes: e.target.value } }))} />
                  <Select value={row.status ?? ""} onValueChange={(v) => setChecklist(s => ({ ...s, [a.key]: { ...s[a.key], status: v } }))}>
                    <SelectTrigger><SelectValue placeholder="Status…" /></SelectTrigger>
                    <SelectContent>{DILIGENCE_STATUSES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Diligence Output (§9.4)</div>
          <div className="grid sm:grid-cols-2 gap-4">
            {DILIGENCE_OUTPUT_FIELDS.map(f => (
              <div key={f.key}>
                <div className="text-xs text-muted-foreground mb-1">{f.label}</div>
                <Textarea rows={2} value={output[f.key] ?? ""} onChange={e => setOutput(s => ({ ...s, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="max-w-xs">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Recommendation</div>
            <Select value={recommendation} onValueChange={setRecommendation}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{DILIGENCE_RECOMMENDATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save diligence"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const VALUATION_METHODS = [
  "Normalised earnings multiple",
  "Revenue multiple",
  "Asset/replacement value",
  "Dividend yield approach",
  "Founder buyback formula",
] as const;

const INSTRUMENTS = ["Minority equity", "Structured debt", "Convertible", "Revenue share", "Hybrid"] as const;

const PROTECTIVE_RIGHTS = [
  { key: "no_new_debt", label: "No new debt or credit facilities without platform consent" },
  { key: "no_related_party", label: "No related-party payments without disclosure and approval" },
  { key: "no_major_capex", label: "No major capital expenditure outside the agreed budget" },
  { key: "no_new_sites", label: "No new branches or site expansion without agreed unit economics" },
  { key: "no_asset_sale", label: "No sale of material assets without consent" },
  { key: "no_business_line_change", label: "No change in business line without discussion" },
  { key: "monthly_reporting", label: "Monthly reporting obligation — non-negotiable" },
  { key: "full_data_access", label: "Full access to accounting, banking, and operational data" },
  { key: "owner_salary_policy", label: "Agreed owner salary or drawings policy" },
] as const;

const STAGED_RELEASE_DEFAULT = [
  { tranche: "Tranche 1", focus: "Systems and urgent stabilisation", released: false },
  { tranche: "Tranche 2", focus: "After reporting and use-of-funds compliance", released: false },
  { tranche: "Tranche 3", focus: "After revenue or margin milestones", released: false },
];

function StructuringTab({ opportunity, opportunityId }: { opportunity: any; opportunityId: string }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<string>(opportunity.valuation_method ?? "");
  const [amount, setAmount] = useState<string>(opportunity.valuation_amount ?? "");
  const [valuationNotes, setValuationNotes] = useState<string>(opportunity.valuation_notes ?? "");
  const [instrument, setInstrument] = useState<string>(opportunity.proposed_instrument ?? "");
  const [stakePct, setStakePct] = useState<string>(opportunity.equity_stake_pct ?? "");
  const [rights, setRights] = useState<Record<string, boolean>>(opportunity.protective_rights ?? {});
  const [allocations, setAllocations] = useState<{ use: string; amount: string; evidence: string }[]>(
    opportunity.use_of_funds_allocations?.length ? opportunity.use_of_funds_allocations : [],
  );
  const [approvalNotes, setApprovalNotes] = useState<string>(opportunity.use_of_funds_approval_notes ?? "");
  const [staged, setStaged] = useState<{ tranche: string; focus: string; released: boolean }[]>(
    opportunity.staged_release?.length ? opportunity.staged_release : STAGED_RELEASE_DEFAULT,
  );

  const saveMut = useMutation({
    mutationFn: () => updateOpportunityStructuring(opportunityId, {
      valuation_method: method || null,
      valuation_amount: amount ? Number(amount) : null,
      valuation_notes: valuationNotes || null,
      proposed_instrument: instrument || null,
      equity_stake_pct: stakePct ? Number(stakePct) : null,
      protective_rights: rights,
      use_of_funds_allocations: allocations,
      use_of_funds_approval_notes: approvalNotes || null,
      staged_release: staged,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Valuation (§10)</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Method</div>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="Select method…" /></SelectTrigger>
                <SelectContent>{VALUATION_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Amount (R)</div>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <Textarea rows={3} placeholder="Inputs, normalising adjustments, entry-multiple discipline…" value={valuationNotes} onChange={e => setValuationNotes(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Structure (§11)</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Instrument</div>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger><SelectValue placeholder="Select instrument…" /></SelectTrigger>
                <SelectContent>{INSTRUMENTS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Equity stake (%)</div>
              <Input type="number" value={stakePct} onChange={e => setStakePct(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Protective Rights — Reserved Matters (§11.3)</div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {PROTECTIVE_RIGHTS.map(r => (
                <label key={r.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!rights[r.key]} onCheckedChange={(v) => setRights(s => ({ ...s, [r.key]: !!v }))} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Use of Funds (§12)</div>
          <div className="space-y-2">
            {allocations.map((a, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_140px_1fr_32px] gap-2 items-start">
                <Input placeholder="Use (e.g. Equipment)" value={a.use} onChange={e => setAllocations(s => s.map((x, j) => j === i ? { ...x, use: e.target.value } : x))} />
                <Input placeholder="Amount (R)" type="number" value={a.amount} onChange={e => setAllocations(s => s.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                <Input placeholder="Evidence" value={a.evidence} onChange={e => setAllocations(s => s.map((x, j) => j === i ? { ...x, evidence: e.target.value } : x))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setAllocations(s => s.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setAllocations(s => [...s, { use: "", amount: "", evidence: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add allocation
            </Button>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Approval Test Notes (§12.3)</div>
            <Textarea rows={3} value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="What problem does this spend solve? How does it improve revenue, margin, cash flow, control or durability? What evidence supports the impact? What if it doesn't work? Can the business afford follow-on costs? Is this the highest leverage use of capital right now?" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Staged Release (§12.4)</div>
            <div className="space-y-2">
              {staged.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Checkbox checked={s.released} onCheckedChange={(v) => setStaged(arr => arr.map((x, j) => j === i ? { ...x, released: !!v } : x))} />
                  <div className="font-medium w-20 shrink-0">{s.tranche}</div>
                  <Input className="flex-1" value={s.focus} onChange={e => setStaged(arr => arr.map((x, j) => j === i ? { ...x, focus: e.target.value } : x))} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save structuring"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const REPORTING_FREQUENCIES = ["Monthly", "Quarterly", "Bi-monthly", "Ad-hoc"] as const;
const APPROVAL_WORKFLOWS = ["Business-as-usual", "Formal committee", "Escalation required"] as const;

const DEFAULT_COVENANTS = [
  { text: "Monthly P&L within 10% of budget", required: true },
  { text: "Monthly cash position forecast", required: true },
  { text: "No staff changes (CTO+) without 30-day notice", required: false },
  { text: "Quarterly customer concentration review", required: false },
  { text: "No new debt >R50k without approval", required: false },
  { text: "Annual founder development plan review", required: false },
  { text: "Unannounced site visits permitted", required: false },
] as const;

function GovernanceTab({ opportunity, opportunityId }: { opportunity: any; opportunityId: string }) {
  const qc = useQueryClient();
  const [boardSeats, setBoardSeats] = useState<string>(opportunity.governance_board_seats ?? "");
  const [reportingFreq, setReportingFreq] = useState<string>(opportunity.governance_reporting_frequency ?? "");
  const [boardObserver, setBoardObserver] = useState<boolean>(opportunity.governance_board_observer ?? false);
  const [salaryCap, setSalaryCap] = useState<string>(opportunity.governance_founder_salary_cap ?? "");
  const [expenseThreshold, setExpenseThreshold] = useState<string>(opportunity.governance_personal_expense_approval_threshold ?? "");
  const [approvalThreshold, setApprovalThreshold] = useState<string>(opportunity.governance_spending_guardrails?.approval_threshold ?? "");
  const [notificationThreshold, setNotificationThreshold] = useState<string>(opportunity.governance_spending_guardrails?.notification_threshold ?? "");
  const [reservePct, setReservePct] = useState<string>(opportunity.governance_spending_guardrails?.reserve_pct ?? "");
  const [workflow, setWorkflow] = useState<string>(opportunity.governance_approval_workflow ?? "");
  const [covenants, setCovenants] = useState<{ text: string; required: boolean }[]>(
    opportunity.governance_covenants?.length ? opportunity.governance_covenants : DEFAULT_COVENANTS.map(c => ({ ...c })),
  );

  const saveMut = useMutation({
    mutationFn: () => updateOpportunityGovernance(opportunityId, {
      governance_board_seats: boardSeats ? Number(boardSeats) : null,
      governance_reporting_frequency: reportingFreq || null,
      governance_board_observer: boardObserver,
      governance_founder_salary_cap: salaryCap ? Number(salaryCap) : null,
      governance_personal_expense_approval_threshold: expenseThreshold ? Number(expenseThreshold) : null,
      governance_spending_guardrails: { approval_threshold: approvalThreshold, notification_threshold: notificationThreshold, reserve_pct: reservePct },
      governance_covenants: covenants,
      governance_approval_workflow: workflow || null,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Board & Reporting (§14.1)</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Board seats</div>
              <Input type="number" value={boardSeats} onChange={e => setBoardSeats(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Reporting frequency</div>
              <Select value={reportingFreq} onValueChange={setReportingFreq}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{REPORTING_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={boardObserver} onCheckedChange={(v) => setBoardObserver(!!v)} />
            Board observer seat
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Founder Salary & Drawings Policy</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Monthly salary cap (R)</div>
              <Input type="number" value={salaryCap} onChange={e => setSalaryCap(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Personal expense approvals (R)</div>
              <Input type="number" value={expenseThreshold} onChange={e => setExpenseThreshold(e.target.value)} placeholder="0" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Spending Guardrails</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Non-negotiable approval threshold (&gt;R)</div>
              <Input type="number" value={approvalThreshold} onChange={e => setApprovalThreshold(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Partner notification threshold (R)</div>
              <Input type="number" value={notificationThreshold} onChange={e => setNotificationThreshold(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Reserved for unforeseen (%)</div>
              <Input type="number" value={reservePct} onChange={e => setReservePct(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Approval workflow</div>
              <Select value={workflow} onValueChange={setWorkflow}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{APPROVAL_WORKFLOWS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Performance Covenants (§14.2)</div>
          <div className="space-y-2">
            {covenants.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <Checkbox checked={c.required} onCheckedChange={(v) => setCovenants(s => s.map((x, j) => j === i ? { ...x, required: !!v } : x))} className="mt-1" />
                <Input className="flex-1" value={c.text} onChange={e => setCovenants(s => s.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setCovenants(s => s.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setCovenants(s => [...s, { text: "", required: false }])}>
              <Plus className="h-3 w-3 mr-1" /> Add covenant
            </Button>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save governance"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HundredDayPlanTab({ opportunity, opportunityId }: { opportunity: any; opportunityId: string }) {
  const qc = useQueryClient();
  const [initiatives, setInitiatives] = useState<{ day_range: string; initiative: string; owner: string; expected_outcome: string }[]>(
    opportunity.hundred_day_plan?.length ? opportunity.hundred_day_plan : [],
  );
  const [milestones, setMilestones] = useState<{ milestone: string; target_value: string; target_date: string }[]>(
    opportunity.hundred_day_milestones?.length ? opportunity.hundred_day_milestones : [],
  );
  const [cashPlan, setCashPlan] = useState<string>(opportunity.hundred_day_cash_plan ?? "");
  const [approvalDate, setApprovalDate] = useState<string>(opportunity.hundred_day_approval_date ?? "");

  const saveMut = useMutation({
    mutationFn: () => updateOpportunityHundredDayPlan(opportunityId, {
      hundred_day_plan: initiatives,
      hundred_day_milestones: milestones,
      hundred_day_cash_plan: cashPlan ? Number(cashPlan) : null,
      hundred_day_approval_date: approvalDate || null,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Key Initiatives — First 100 Days (§13)</div>
          <div className="space-y-2">
            {initiatives.map((init, i) => (
              <div key={i} className="grid sm:grid-cols-[120px_1fr_100px_1fr_32px] gap-2 items-start">
                <Input placeholder="Day range" value={init.day_range} onChange={e => setInitiatives(s => s.map((x, j) => j === i ? { ...x, day_range: e.target.value } : x))} />
                <Input placeholder="Initiative" value={init.initiative} onChange={e => setInitiatives(s => s.map((x, j) => j === i ? { ...x, initiative: e.target.value } : x))} />
                <Input placeholder="Owner" value={init.owner} onChange={e => setInitiatives(s => s.map((x, j) => j === i ? { ...x, owner: e.target.value } : x))} />
                <Input placeholder="Expected outcome" value={init.expected_outcome} onChange={e => setInitiatives(s => s.map((x, j) => j === i ? { ...x, expected_outcome: e.target.value } : x))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setInitiatives(s => s.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setInitiatives(s => [...s, { day_range: "", initiative: "", owner: "", expected_outcome: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add initiative
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">5–7 Key Milestones</div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_100px_100px_32px] gap-2 items-start">
                <Input placeholder="Milestone (e.g. Revenue proof point)" value={m.milestone} onChange={e => setMilestones(s => s.map((x, j) => j === i ? { ...x, milestone: e.target.value } : x))} />
                <Input placeholder="Target value" value={m.target_value} onChange={e => setMilestones(s => s.map((x, j) => j === i ? { ...x, target_value: e.target.value } : x))} />
                <Input placeholder="Date (MM/DD)" value={m.target_date} onChange={e => setMilestones(s => s.map((x, j) => j === i ? { ...x, target_date: e.target.value } : x))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setMilestones(s => s.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setMilestones(s => [...s, { milestone: "", target_value: "", target_date: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add milestone
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">100-Day Cash Plan</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total drawdown authority (R)</div>
              <Input type="number" value={cashPlan} onChange={e => setCashPlan(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Plan approval date</div>
              <Input type="date" value={approvalDate} onChange={e => setApprovalDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save plan"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Simple({ items, render }: { items: any[]; render: (x: any) => string }) {
  if (!items.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nothing here yet.</CardContent></Card>;
  return <div className="space-y-2">{items.map(x => <Card key={x.id}><CardContent className="p-3 text-sm">{render(x)}</CardContent></Card>)}</div>;
}
