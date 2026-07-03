import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanies, fetchCompanyProfile } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Building2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/companies/")({
  component: () => <AppShell><CompaniesList /></AppShell>,
});

function CompaniesList() {
  const q = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const [s, setS] = useState("");
  const list = (q.data ?? []).filter((c: any) => !s || `${c.name} ${c.industry ?? ""}`.toLowerCase().includes(s.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="Portfolio" title="Companies" description="Every operating business connected to the platform." />
      <div className="mb-4 max-w-sm"><Input placeholder="Search companies…" value={s} onChange={e => setS(e.target.value)} /></div>
      {list.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center"><Building2 className="h-6 w-6 mx-auto mb-2" />No companies yet. Add one from a founder profile.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c: any) => (
            <Link key={c.id} to="/companies/$id" params={{ id: c.id }}>
              <Card className="hover:border-primary/50 transition-colors"><CardContent className="p-5">
                <div className="font-serif text-lg">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.industry ?? "—"}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.investment_stage && <Badge variant="outline" className="text-[10px]">{c.investment_stage}</Badge>}
                  {c.revenue_band && <Badge variant="outline" className="text-[10px]">{c.revenue_band}</Badge>}
                  {c.status && <Badge variant="outline" className="text-[10px]">{c.status}</Badge>}
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
export function CompanyProfile() {
  const { id } = useParams({ from: "/companies/$id" });
  const q = useQuery({ queryKey: ["company", id], queryFn: () => fetchCompanyProfile(id) });
  if (q.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (q.error || !q.data) return <div className="p-10 text-destructive">Could not load company.</div>;
  const { company, founders, meetings, notes, tasks, documents, opportunities, investments } = q.data;
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <Link to="/companies" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-3 w-3" /> Companies</Link>
      <Card><CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded bg-muted flex items-center justify-center font-serif text-2xl">{company.name?.[0]}</div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{company.status ?? "Prospect"}</div>
            <h1 className="font-serif text-3xl">{company.name}</h1>
            <div className="text-sm text-muted-foreground">{company.industry} · {company.province ?? company.country}</div>
            <div className="flex gap-2 mt-3">
              {company.investment_stage && <Badge variant="outline">{company.investment_stage}</Badge>}
              {company.relationship_owner && <Badge variant="outline">Owner · {company.relationship_owner}</Badge>}
            </div>
          </div>
        </div>
      </CardContent></Card>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1">
          {["overview","founders","meetings","documents","notes","tasks","opportunities","investments"].map(t => <TabsTrigger key={t} value={t} className="capitalize text-xs">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            {(["summary","problem_solved","products","services","business_model","customers","website","linkedin","address","registration_number","vat_number","current_funding","employees","founded_year","revenue_band"] as const).map(k => {
              const v = (company as any)[k]; if (!v) return null;
              return <Card key={k}><CardContent className="p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k.replace(/_/g," ")}</div><div className="text-sm">{String(v)}</div></CardContent></Card>;
            })}
          </div>
        </TabsContent>
        <TabsContent value="founders">
          <div className="grid md:grid-cols-2 gap-3">{founders.map((f: any) => f && (
            <Link key={f.id} to="/founders/$id" params={{ id: f.id }}><Card><CardContent className="p-4"><div className="font-medium">{f.name}</div><div className="text-xs text-muted-foreground">{f.sector}</div></CardContent></Card></Link>
          ))}</div>
        </TabsContent>
        <TabsContent value="meetings"><Simple items={meetings} render={(m: any) => `${m.title ?? "Meeting"} — ${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : ""}`} /></TabsContent>
        <TabsContent value="documents"><Simple items={documents} render={(d: any) => `${d.title ?? d.file_name} · ${d.doc_type ?? ""}`} /></TabsContent>
        <TabsContent value="notes"><Simple items={notes} render={(n: any) => n.body} /></TabsContent>
        <TabsContent value="tasks"><Simple items={tasks} render={(t: any) => `${t.title} · ${t.status}`} /></TabsContent>
        <TabsContent value="opportunities"><Simple items={opportunities} render={(o: any) => `${o.name} · ${o.current_stage}`} /></TabsContent>
        <TabsContent value="investments"><Simple items={investments} render={(i: any) => `${i.instrument} · R${Number(i.amount ?? 0).toLocaleString()}`} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Simple({ items, render }: { items: any[]; render: (x: any) => string }) {
  if (!items.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nothing here yet.</CardContent></Card>;
  return <div className="space-y-2">{items.map(x => <Card key={x.id}><CardContent className="p-3 text-sm">{render(x)}</CardContent></Card>)}</div>;
}
