import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchOpportunities, fetchOpportunityProfile } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Target } from "lucide-react";

export const Route = createFileRoute("/opportunities/")({
  component: () => <AppShell><OpportunitiesList /></AppShell>,
});

function OpportunitiesList() {
  const q = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunities });
  const list = q.data ?? [];
  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="Pipeline" title="Opportunities" description="Discrete investment opportunities. A founder can have several over time." />
      {list.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center"><Target className="h-6 w-6 mx-auto mb-2" />No opportunities yet.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((o: any) => (
            <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }}>
              <Card className="hover:border-primary/50 transition-colors"><CardContent className="p-5">
                <div className="flex justify-between"><div className="font-serif text-lg">{o.name}</div><Badge variant="outline">{o.current_stage}</Badge></div>
                <div className="text-xs text-muted-foreground mt-1">{o.founder?.name ?? "—"} · {o.company?.name ?? ""}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Priority · {o.priority}</div>
                  <div>Probability · {o.probability ?? "—"}%</div>
                </div>
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
        </div>
      </CardContent></Card>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1">
          {["overview","meetings","documents","notes","tasks","risks","value","committee","timeline","investments"].map(t => <TabsTrigger key={t} value={t} className="capitalize text-xs">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview">
          <Card><CardContent className="p-4 text-sm">{opportunity.summary ?? "No summary yet."}</CardContent></Card>
        </TabsContent>
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

function Simple({ items, render }: { items: any[]; render: (x: any) => string }) {
  if (!items.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nothing here yet.</CardContent></Card>;
  return <div className="space-y-2">{items.map(x => <Card key={x.id}><CardContent className="p-3 text-sm">{render(x)}</CardContent></Card>)}</div>;
}
