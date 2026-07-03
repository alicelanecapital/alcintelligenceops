import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchFounderProfile, addFounderNote, addFounderTask, addFounderMeeting, addCompanyForFounder, addOpportunity, updateFounderAssessment } from "@/lib/founders-data";
import { refreshFounderIntelligence } from "@/lib/founders-intel.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles, RefreshCw, CalendarPlus, StickyNote, ListTodo, Building2, Target, FileText, Users, Mic, Mail, Phone, Linkedin, MapPin, ArrowLeft, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/founders/$id")({
  component: () => (
    <AppShell>
      <FounderProfile />
    </AppShell>
  ),
});

function FounderProfile() {
  const { id } = useParams({ from: "/founders/$id" });
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["founder", id], queryFn: () => fetchFounderProfile(id) });
  const refreshFn = useServerFn(refreshFounderIntelligence);
  const refreshMut = useMutation({
    mutationFn: () => refreshFn({ data: { founderId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["founder", id] }),
  });

  if (q.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (q.error || !q.data) return <div className="p-10 text-destructive">Could not load founder.</div>;

  const { founder, companies, opportunities, meetings, notes, tasks, documents, timeline, contacts, interviews, communications, investments, intel } = q.data;

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      <Link to="/founders" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Founders
      </Link>

      <ProfileHeader founder={founder} />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 mt-6">
        <IntelligencePanel intel={intel} onRefresh={() => refreshMut.mutate()} refreshing={refreshMut.isPending} founderId={id} />

        <div className="min-w-0">
          <QuickActions founderId={id} />

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1">
              {["overview","assessment","timeline","companies","meetings","interviews","documents","contacts","tasks","notes","opportunities","communications","investments"].map(t => (
                <TabsTrigger key={t} value={t} className="capitalize text-xs">{t}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview"><OverviewTab founder={founder} /></TabsContent>
            <TabsContent value="assessment"><AssessmentTab founder={founder} founderId={id} /></TabsContent>
            <TabsContent value="timeline"><TimelineTab events={timeline} /></TabsContent>
            <TabsContent value="companies"><CompaniesTab companies={companies} founderId={id} /></TabsContent>
            <TabsContent value="meetings"><MeetingsTab meetings={meetings} founderId={id} /></TabsContent>
            <TabsContent value="interviews"><InterviewsTab interviews={interviews} founderId={id} /></TabsContent>
            <TabsContent value="documents"><DocumentsTab documents={documents} /></TabsContent>
            <TabsContent value="contacts"><ContactsTab contacts={contacts} /></TabsContent>
            <TabsContent value="tasks"><TasksTab tasks={tasks} founderId={id} /></TabsContent>
            <TabsContent value="notes"><NotesTab notes={notes} founderId={id} /></TabsContent>
            <TabsContent value="opportunities"><OpportunitiesTab opportunities={opportunities} founderId={id} /></TabsContent>
            <TabsContent value="communications"><CommsTab items={communications} /></TabsContent>
            <TabsContent value="investments"><InvestmentsTab items={investments} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ProfileHeader({ founder }: { founder: any }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
            {founder.photo_url ? <img src={founder.photo_url} alt={founder.name} className="h-full w-full object-cover" /> : <span className="font-serif text-3xl text-muted-foreground">{founder.name?.[0]}</span>}
          </div>
          <div className="flex-1 min-w-[260px]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{founder.status ?? "Active"}</div>
            <h1 className="font-serif text-4xl mt-1">{founder.name}</h1>
            <div className="text-sm text-muted-foreground mt-1">{founder.startup_name ?? founder.organisation?.name ?? "—"}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              {founder.stage && <Badge variant="outline">Stage · {founder.stage}</Badge>}
              {founder.sector && <Badge variant="outline">{founder.sector}</Badge>}
              {founder.industry && <Badge variant="outline">{founder.industry}</Badge>}
              {founder.location && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{founder.location}</Badge>}
              {founder.assigned_partner && <Badge variant="outline">Partner · {founder.assigned_partner}</Badge>}
              {founder.founder_archetype && <Badge variant="outline">{founder.founder_archetype}</Badge>}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              {founder.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{founder.email}</span>}
              {founder.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{founder.phone}</span>}
              {founder.linkedin && <a href={founder.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><Linkedin className="h-3 w-3" />LinkedIn</a>}
              {founder.first_met_date && <span>Met {founder.first_met_date}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Relationship</div>
            <div className="font-serif text-5xl text-primary">{founder.relationship_strength ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">strength / 100</div>
            {founder.ai_investment_score != null && (
              <div className="mt-3 text-xs"><Badge className="bg-primary/10 text-primary border border-primary/30">AI score {founder.ai_investment_score}</Badge></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntelligencePanel({ intel, onRefresh, refreshing, founderId: _founderId }: { intel: any; onRefresh: () => void; refreshing: boolean; founderId: string }) {
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-xl inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Founder Intelligence</CardTitle>
            <Button size="sm" variant="ghost" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={"h-3 w-3 mr-1 " + (refreshing ? "animate-spin" : "")} /> {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {intel?.generated_at ? `Generated ${formatDistanceToNow(new Date(intel.generated_at))} ago` : "Never generated — click Refresh"}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {!intel && <p className="text-muted-foreground">No intelligence yet. Refresh to have Gemini read every meeting, note and interview and produce a living relationship snapshot.</p>}

          {intel?.snapshot && (
            <Section title="Snapshot">
              <p className="text-foreground leading-relaxed">{intel.snapshot}</p>
            </Section>
          )}

          {intel?.relationship_health?.rating && (
            <Section title="Relationship Health">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-primary-foreground">{intel.relationship_health.rating}</Badge>
                <span className="text-xs text-muted-foreground">{intel.relationship_health.reason}</span>
              </div>
            </Section>
          )}

          {Array.isArray(intel?.recent_developments) && intel.recent_developments.length > 0 && (
            <Section title="Recent Developments">
              <ul className="space-y-2">
                {intel.recent_developments.slice(0, 5).map((d: any, i: number) => (
                  <li key={i} className="text-xs"><span className="font-medium text-foreground">{d.title}</span><span className="text-muted-foreground"> — {d.detail}</span></li>
                ))}
              </ul>
            </Section>
          )}

          {Array.isArray(intel?.open_commitments) && intel.open_commitments.length > 0 && (
            <Section title="Open Commitments">
              <ul className="space-y-1.5">
                {intel.open_commitments.map((c: any, i: number) => (
                  <li key={i} className="text-xs flex gap-2">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span><span className="uppercase text-[9px] tracking-widest text-primary mr-1">{c.party}</span>{c.commitment}{c.due && <span className="text-muted-foreground"> · due {c.due}</span>}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {Array.isArray(intel?.knowledge_gaps) && intel.knowledge_gaps.length > 0 && (
            <Section title="Knowledge Gaps">
              <ul className="space-y-1.5">
                {intel.knowledge_gaps.map((g: any, i: number) => (
                  <li key={i} className="text-xs flex gap-2"><AlertCircle className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" /><span>{g.gap}<span className="text-muted-foreground"> — {g.why_it_matters}</span></span></li>
                ))}
              </ul>
            </Section>
          )}

          {Array.isArray(intel?.next_best_actions) && intel.next_best_actions.length > 0 && (
            <Section title="Next Best Actions">
              <ul className="space-y-2">
                {intel.next_best_actions.map((a: any, i: number) => (
                  <li key={i} className="text-xs border-l-2 border-primary/40 pl-2">
                    <div className="font-medium">{a.action}</div>
                    <div className="text-muted-foreground">{a.reason}</div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function QuickActions({ founderId }: { founderId: string }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<null | "note" | "task" | "meeting" | "company" | "opportunity">(null);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");

  async function submit() {
    if (!v1) return;
    if (mode === "note") await addFounderNote(founderId, v1);
    if (mode === "task") await addFounderTask(founderId, v1, v2 || undefined);
    if (mode === "meeting") await addFounderMeeting(founderId, { title: v1, summary: v2, meeting_date: new Date().toISOString() });
    if (mode === "company") await addCompanyForFounder(founderId, v1, v2 || undefined);
    if (mode === "opportunity") await addOpportunity(founderId, v1, v2 || undefined);
    setV1(""); setV2(""); setMode(null);
    qc.invalidateQueries({ queryKey: ["founder", founderId] });
  }

  const actions = [
    { key: "meeting", label: "Log Meeting", icon: CalendarPlus },
    { key: "note", label: "Add Note", icon: StickyNote },
    { key: "task", label: "Create Task", icon: ListTodo },
    { key: "company", label: "Add Company", icon: Building2 },
    { key: "opportunity", label: "Create Opportunity", icon: Target },
    { key: "interview", label: "Start Interview", icon: Mic, href: "/interviews" as const },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map(a => a.href ? (
          <Link key={a.key} to={a.href}><Button variant="outline" size="sm"><a.icon className="h-3 w-3 mr-1" />{a.label}</Button></Link>
        ) : (
          <Button key={a.key} variant="outline" size="sm" onClick={() => setMode(a.key as any)}><a.icon className="h-3 w-3 mr-1" />{a.label}</Button>
        ))}
      </div>
      {mode && (
        <Card className="mt-3">
          <CardContent className="p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{mode}</div>
            {mode === "note" ? (
              <Textarea placeholder="Note body…" value={v1} onChange={e => setV1(e.target.value)} rows={4} />
            ) : (
              <Input placeholder={mode === "task" ? "Task title" : mode === "meeting" ? "Meeting title" : mode === "company" ? "Company name" : "Opportunity name"} value={v1} onChange={e => setV1(e.target.value)} />
            )}
            {mode !== "note" && (
              <Input placeholder={mode === "task" ? "Due date (YYYY-MM-DD)" : mode === "meeting" ? "Summary" : "Industry"} value={v2} onChange={e => setV2(e.target.value)} />
            )}
            <div className="flex gap-2 justify-end"><Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancel</Button><Button size="sm" onClick={submit}>Save</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OverviewTab({ founder }: { founder: any }) {
  const rows = ([
    ["Biography", founder.biography],
    ["Sector", founder.sector],
    ["Stage", founder.stage],
    ["Location", founder.location],
    ["Startup", founder.startup_name],
    ["Problem", founder.problem],
    ["Solution", founder.solution],
    ["Traction", founder.traction],
    ["Revenue", founder.revenue],
    ["Funding sought", founder.funding_sought],
    ["Employees", founder.employees],
    ["Why interesting", founder.why_interesting],
    ["Referral source", founder.referral_source],
    ["Achievements", founder.achievements],
    ["Awards", founder.awards],
    ["Current challenges", founder.challenges],
    ["Current opportunities", founder.opportunities_text],
    ["Internal notes", founder.internal_notes],
  ] as [string, any][]).filter(([, v]) => v);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {rows.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No overview data yet.</CardContent></Card>}
      {rows.map(([k, v]) => (
        <Card key={k}><CardContent className="p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k}</div><div className="text-sm">{String(v)}</div></CardContent></Card>
      ))}
    </div>
  );
}

const TRAITS = [
  { key: "truthfulness_score", label: "Truthfulness" },
  { key: "commercial_instinct_score", label: "Commercial instinct" },
  { key: "coachability_score", label: "Coachability" },
  { key: "owner_mentality_score", label: "Owner mentality" },
] as const;

const ARCHETYPES = ["Investable", "Potentially Investable", "High-Risk", "Not Investable"] as const;

function AssessmentTab({ founder, founderId }: { founder: any; founderId: string }) {
  const qc = useQueryClient();
  const [scores, setScores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(TRAITS.map(t => [t.key, founder[t.key] ?? null])),
  );
  const [archetype, setArchetype] = useState<string>(founder.founder_archetype ?? "");
  const [notes, setNotes] = useState<string>(founder.assessment_notes ?? "");

  const saveMut = useMutation({
    mutationFn: () => updateFounderAssessment(founderId, {
      ...scores,
      founder_archetype: archetype || null,
      assessment_notes: notes || null,
    } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["founder", founderId] }),
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Four Core Traits</div>
          <div className="space-y-3">
            {TRAITS.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-4">
                <div className="text-sm">{t.label}</div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScores(s => ({ ...s, [t.key]: n }))}
                      className={cn(
                        "h-7 w-7 rounded-full border text-xs flex items-center justify-center transition-colors",
                        scores[t.key] === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Archetype</div>
          <Select value={archetype} onValueChange={setArchetype}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select archetype…" /></SelectTrigger>
            <SelectContent>
              {ARCHETYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Notes</div>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Reference checks, credit history context, behaviour signals…" />
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save assessment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineTab({ events }: { events: any[] }) {
  if (!events.length) return <EmptyState title="No activity yet" hint="Meetings, notes and tasks appear here in order." />;
  return (
    <div className="space-y-3">
      {events.map(e => (
        <div key={e.id} className="flex gap-3 border-l-2 border-primary/30 pl-4 py-1">
          <Clock className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-primary">{e.event_type}</div>
            <div className="text-sm font-medium">{e.title}</div>
            {e.body && <div className="text-xs text-muted-foreground mt-0.5">{e.body}</div>}
            <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(e.occurred_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompaniesTab({ companies, founderId: _fid }: { companies: any[]; founderId: string }) {
  if (!companies.length) return <EmptyState title="No companies linked" hint="Add a company via Quick Actions." />;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {companies.map((fc: any) => {
        const c = fc.company;
        return (
          <Card key={fc.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif text-lg">{c?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c?.industry} · {c?.province ?? c?.country}</div>
                </div>
                <Badge variant="outline">{fc.role}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Field label="Stage" v={c?.investment_stage} />
                <Field label="Revenue" v={c?.revenue_band} />
                <Field label="Employees" v={c?.employees} />
                <Field label="Founded" v={c?.founded_year} />
              </div>
              {c?.id && <Link to="/companies/$id" params={{ id: c.id }}><Button size="sm" variant="outline" className="mt-3">Open Profile</Button></Link>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Field({ label, v }: { label: string; v: any }) {
  return <div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div><div>{v ?? "—"}</div></div>;
}

function MeetingsTab({ meetings, founderId: _fid }: { meetings: any[]; founderId: string }) {
  if (!meetings.length) return <EmptyState title="No meetings logged" hint="Every meeting stores agenda, transcript, decisions and action items." />;
  return (
    <div className="space-y-3">
      {meetings.map(m => (
        <Card key={m.id}><CardContent className="p-4">
          <div className="flex justify-between"><div className="font-medium">{m.title ?? "Meeting"}</div><div className="text-xs text-muted-foreground">{m.meeting_date ? new Date(m.meeting_date).toLocaleString() : "—"}</div></div>
          {m.location && <div className="text-xs text-muted-foreground">{m.location}</div>}
          {m.summary && <p className="text-sm mt-2">{m.summary}</p>}
          {m.outcome && <Badge className="mt-2" variant="outline">Outcome: {m.outcome}</Badge>}
        </CardContent></Card>
      ))}
    </div>
  );
}

function InterviewsTab({ interviews, founderId }: { interviews: any[]; founderId: string }) {
  return (
    <div className="space-y-3">
      <Link to="/interviews"><Button size="sm">Start / open interview workspace</Button></Link>
      {interviews.length === 0 && <EmptyState title="No interviews yet" hint="Interviews link back here automatically." />}
      {interviews.map(i => (
        <Card key={i.id}><CardContent className="p-4 flex justify-between items-center">
          <div><div className="font-medium">Interview {i.id.slice(0, 8)}</div><div className="text-xs text-muted-foreground">{i.status} · {i.started_at ? new Date(i.started_at).toLocaleDateString() : "—"}</div></div>
          <Link to="/interviews/$id" params={{ id: i.id }}><Button size="sm" variant="outline">Open</Button></Link>
        </CardContent></Card>
      ))}
      {/* founderId reserved for future new-interview shortcut */}
      <input type="hidden" value={founderId} readOnly />
    </div>
  );
}

function DocumentsTab({ documents }: { documents: any[] }) {
  if (!documents.length) return <EmptyState title="No documents" hint="Upload pitch decks, financials, legal, tax and contracts here." />;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {documents.map(d => (
        <Card key={d.id}><CardContent className="p-4">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><div className="font-medium">{d.title ?? d.file_name}</div></div>
          <div className="text-xs text-muted-foreground mt-1">{d.doc_type} · v{d.version}</div>
          {d.ai_summary && <p className="text-xs mt-2 text-muted-foreground line-clamp-3">{d.ai_summary}</p>}
        </CardContent></Card>
      ))}
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: any[] }) {
  if (!contacts.length) return <EmptyState title="No contacts yet" hint="Co-founders, investors, mentors and advisors." />;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {contacts.map(c => (
        <Card key={c.id}><CardContent className="p-4"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.role ?? "—"} · {c.email ?? ""}</div></CardContent></Card>
      ))}
    </div>
  );
}

function TasksTab({ tasks, founderId: _fid }: { tasks: any[]; founderId: string }) {
  if (!tasks.length) return <EmptyState title="No tasks" hint="Create a task via Quick Actions." />;
  return (
    <div className="space-y-2">
      {tasks.map(t => (
        <Card key={t.id}><CardContent className="p-3 flex justify-between items-center">
          <div><div className="text-sm font-medium">{t.title}</div><div className="text-xs text-muted-foreground">{t.status} · {t.priority}{t.due_date ? ` · due ${t.due_date}` : ""}</div></div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function NotesTab({ notes, founderId: _fid }: { notes: any[]; founderId: string }) {
  if (!notes.length) return <EmptyState title="No notes" hint="Capture context, observations and follow-ups." />;
  return (
    <div className="space-y-3">
      {notes.map(n => (
        <Card key={n.id}><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{n.author ?? "—"} · {new Date(n.created_at).toLocaleString()}</div>
          <p className="text-sm whitespace-pre-wrap">{n.body}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}

function OpportunitiesTab({ opportunities, founderId: _fid }: { opportunities: any[]; founderId: string }) {
  if (!opportunities.length) return <EmptyState title="No opportunities" hint="One founder can have several opportunities over time." />;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {opportunities.map(o => (
        <Card key={o.id}><CardContent className="p-4">
          <div className="flex justify-between"><div className="font-medium">{o.name}</div><Badge variant="outline">{o.current_stage}</Badge></div>
          <div className="text-xs text-muted-foreground mt-1">{o.industry ?? "—"} · {o.company?.name ?? ""}</div>
          <Link to="/opportunities/$id" params={{ id: o.id }}><Button size="sm" variant="outline" className="mt-3">Open</Button></Link>
        </CardContent></Card>
      ))}
    </div>
  );
}

function CommsTab({ items }: { items: any[] }) {
  if (!items.length) return <EmptyState title="No communications logged" hint="Emails, calls and messages." />;
  return <div className="space-y-2">{items.map(c => (
    <Card key={c.id}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{c.kind} · {c.direction} · {new Date(c.occurred_at).toLocaleString()}</div><div className="text-sm">{c.subject}</div></CardContent></Card>
  ))}</div>;
}

function InvestmentsTab({ items }: { items: any[] }) {
  if (!items.length) return <EmptyState title="No investments yet" hint="Committed and funded rounds appear here." />;
  return <div className="space-y-2">{items.map(i => (
    <Card key={i.id}><CardContent className="p-3 flex justify-between"><div><div className="text-sm font-medium">{i.instrument} · {i.status}</div><div className="text-xs text-muted-foreground">{i.invested_at}</div></div><div className="font-serif text-xl">R{Number(i.amount ?? 0).toLocaleString()}</div></CardContent></Card>
  ))}</div>;
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return <Card><CardContent className="p-8 text-center"><Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" /><div className="font-medium">{title}</div><div className="text-xs text-muted-foreground mt-1">{hint}</div></CardContent></Card>;
}
