import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, KpiStrip } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchDeals, fetchOrgs, fetchFounders, fetchContacts, fetchEvents, DEAL_STAGES } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export const Route = createFileRoute("/")({ component: () => <AppShell><Dashboard /></AppShell> });

const COLORS = ["#0F766E", "#14B8A6", "#5EEAD4", "#94A3B8", "#334155"];

function Dashboard() {
  const deals = useQuery({ queryKey: ["deals"], queryFn: fetchDeals });
  const smes = useQuery({ queryKey: ["orgs","sme"], queryFn: () => fetchOrgs("sme") });
  const ecos = useQuery({ queryKey: ["orgs","ecosystem"], queryFn: () => fetchOrgs("ecosystem") });
  const founders = useQuery({ queryKey: ["founders"], queryFn: fetchFounders });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  const active = (deals.data ?? []).filter((d: any) => !["Funded","Portfolio","Passed"].includes(d.stage)).length;
  const highFit = (ecos.data ?? []).filter((o) => (o.fit_rating ?? "").toLowerCase().startsWith("high")).length;

  const byStage = DEAL_STAGES.map((s) => ({ stage: s, count: (deals.data ?? []).filter((d: any) => d.stage === s).length }));
  const sectorMap = new Map<string, number>();
  (smes.data ?? []).forEach((o) => { const k = o.industry || "Uncategorised"; sectorMap.set(k, (sectorMap.get(k) ?? 0) + 1); });
  const bySector = Array.from(sectorMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);

  const conversionRate = `${Math.round(((deals.data ?? []).filter((d:any)=>d.stage==="Funded").length / Math.max(1, (deals.data ?? []).length))*100)}%`;
  const avgDealsPerFounder = ((deals.data ?? []).length / Math.max(1, (founders.data ?? []).length)).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-10 py-12">
      <PageHeader
        eyebrow="Dashboard"
        title="Good morning."
        description="A live snapshot of the Alice Lane origination engine — pipeline health, priority ecosystem plays and founders worth a call today."
      />
      <KpiStrip items={[
        { label: "Active deals", value: active, hint: `${deals.data?.length ?? 0} total` },
        { label: "Founders", value: founders.data?.length ?? 0 },
        { label: "SMEs sourced", value: smes.data?.length ?? 0, hint: "from MSME list" },
        { label: "Ecosystem partners", value: ecos.data?.length ?? 0, hint: `${highFit} high fit` },
        { label: "Contacts", value: contacts.data?.length ?? 0 },
      ]} />

      <div className="grid lg:grid-cols-3 gap-6 mt-10">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-serif text-2xl flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI narrative</CardTitle>
            <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Generated</Badge>
          </CardHeader>
          <CardContent className="text-[15px] text-foreground/80 leading-relaxed space-y-3">
            <p>The pipeline is anchored by <strong>{active} live opportunities</strong> — the majority sourced from the recent MSME selection list. Beauty, Automotive and Architecture are the deepest verticals; each has 3+ founders ready to progress from screening.</p>
            <p>On the ecosystem side, <strong>{highFit} partners scored “High fit”</strong> including SAB Foundation, TechnoServe, The Hope Factory and Endeavor South Africa — prioritise a warm intro to two of these this week to unlock structured referral pipelines.</p>
            <p>Once the AI event-discovery job is enabled, this briefing will also surface the top three events worth attending in the next 30 days.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-2xl">Priority ecosystem plays</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(ecos.data ?? []).filter(o => (o.fit_rating ?? "").toLowerCase().startsWith("high")).slice(0,6).map(o => (
              <div key={o.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{o.name}</div>
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">{o.fit_rating}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{o.category}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader><CardTitle className="font-serif text-2xl">Pipeline by stage</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEAL_STAGES.map(s => {
                const n = (deals.data ?? []).filter((d: any) => d.stage === s).length;
                const max = Math.max(1, ...DEAL_STAGES.map(x => (deals.data ?? []).filter((d: any) => d.stage === x).length));
                return (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    <div className="w-40 text-muted-foreground">{s}</div>
                    <div className="flex-1 h-2 bg-muted rounded"><div className="h-2 bg-primary rounded" style={{ width: `${(n/max)*100}%` }} /></div>
                    <div className="w-8 tabular-nums text-right">{n}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-2xl">Upcoming events</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {(events.data ?? []).length === 0
              ? <p className="text-muted-foreground">No events yet. Enable the AI discovery job to auto-populate this feed with SA-relevant startup, VC and MSME events.</p>
              : (events.data ?? []).slice(0,5).map((e: any) => (
                <div key={e.id} className="border-b border-border last:border-0 py-3">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.city} · {e.start_date}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-2xl mb-4">Pipeline analytics</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Deals by stage</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer><BarChart data={byStage}>
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip /><Bar dataKey="count" fill="#0F766E" />
              </BarChart></ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">SME mix by sector</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer><PieChart>
                <Pie data={bySector} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 11 }}>
                  {bySector.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip />
              </PieChart></ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          {[
            { label: "Conversion rate", value: conversionRate, hint: "Funded / total" },
            { label: "Avg deals per founder", value: avgDealsPerFounder },
            { label: "SMEs in pipeline", value: smes.data?.length ?? 0 },
          ].map(k => (
            <Card key={k.label}><CardContent className="p-6">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className="font-serif text-4xl mt-2">{k.value}</div>
              {k.hint && <div className="text-xs text-muted-foreground mt-1">{k.hint}</div>}
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
