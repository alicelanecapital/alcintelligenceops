import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchDeals, fetchOrgs, fetchFounders, DEAL_STAGES } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export const Route = createFileRoute("/analytics")({ component: () => <AppShell><Analytics /></AppShell> });

const COLORS = ["#0B1F3A", "#B7873B", "#6B8E4E", "#B25E3D", "#8896A6"];

function Analytics() {
  const deals = useQuery({ queryKey: ["deals"], queryFn: fetchDeals });
  const smes = useQuery({ queryKey: ["orgs","sme"], queryFn: () => fetchOrgs("sme") });
  const founders = useQuery({ queryKey: ["founders"], queryFn: fetchFounders });

  const byStage = DEAL_STAGES.map((s) => ({ stage: s, count: (deals.data ?? []).filter((d: any) => d.stage === s).length }));
  const sectorMap = new Map<string, number>();
  (smes.data ?? []).forEach((o) => { const k = o.industry || "Uncategorised"; sectorMap.set(k, (sectorMap.get(k) ?? 0) + 1); });
  const bySector = Array.from(sectorMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="Insights" title="Pipeline Analytics" description="Where deals come from, where they stall, and where the highest-quality origination is happening." />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Deals by stage</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><BarChart data={byStage}>
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip /><Bar dataKey="count" fill="#B7873B" />
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
          { label: "Conversion rate", value: `${Math.round(((deals.data ?? []).filter((d:any)=>d.stage==="Funded").length / Math.max(1, (deals.data ?? []).length))*100)}%`, hint: "Funded / total" },
          { label: "Avg deals per founder", value: ((deals.data ?? []).length / Math.max(1, (founders.data ?? []).length)).toFixed(2) },
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
  );
}
