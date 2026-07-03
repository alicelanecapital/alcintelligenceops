import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchOrgs, type OrgRow } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/ecosystem")({ component: () => <AppShell><Ecosystem /></AppShell> });

const fitScore = (f: string | null) => {
  if (!f) return 30;
  const s = f.toLowerCase();
  if (s.startsWith("high")) return 90;
  if (s.startsWith("medium-high")) return 75;
  if (s.startsWith("medium")) return 55;
  if (s.startsWith("low")) return 30;
  return 40;
};

function Ecosystem() {
  const q = useQuery({ queryKey: ["orgs","ecosystem"], queryFn: () => fetchOrgs("ecosystem") });
  const orgs = q.data ?? [];
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => orgs.filter(o => !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.category ?? "").toLowerCase().includes(search.toLowerCase())), [orgs, search]);
  const categories = Array.from(new Set(orgs.map(o => o.category).filter(Boolean))) as string[];

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="Map" title="Ecosystem" description="South Africa's origination ecosystem — foundations, incubators, funds, hubs, universities, networks and government." />
      <div className="mb-4 flex items-center gap-4">
        <Input placeholder="Search organisations…" className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="text-xs text-muted-foreground">{filtered.length} of {orgs.length}</div>
      </div>
      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="bubble">Bubble</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="graph">Network</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(o => (
              <Card key={o.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-serif text-lg leading-tight">{o.name}</div>
                    {o.fit_rating && <Badge className="bg-primary text-primary-foreground shrink-0">{o.fit_rating}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{o.category}</div>
                  {o.purpose && <p className="text-xs text-foreground/80 mt-3 line-clamp-3">{o.purpose}</p>}
                  {o.who_they_serve && <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2">{o.who_they_serve}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Organisation</TableHead><TableHead>Category</TableHead><TableHead>Fit</TableHead><TableHead>Status</TableHead><TableHead>Purpose</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell><Badge variant="outline">{o.category}</Badge></TableCell>
                    <TableCell>{o.fit_rating}</TableCell>
                    <TableCell className="text-muted-foreground">{o.status ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md line-clamp-2">{o.purpose}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="bubble" className="mt-6">
          <Card><CardContent className="p-6 h-[500px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="category" dataKey="category" name="Category" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={80} />
                <YAxis type="number" dataKey="fit" name="Strategic fit" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <ZAxis type="number" dataKey="size" range={[80, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: any, n: any, p: any) => [v, p.payload.name]} />
                <Scatter data={filtered.map((o: OrgRow) => ({ name: o.name, category: o.category ?? "Other", fit: fitScore(o.fit_rating), size: 50 }))} fill="#0F766E" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `160px repeat(${categories.length}, minmax(120px, 1fr))` }}>
              <div className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">Fit ↓ / Category →</div>
              {categories.map(c => <div key={c} className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-l border-border truncate">{c}</div>)}
              {["High","Medium-High","Medium","Low"].flatMap(fitBand => [
                <div key={fitBand+"h"} className="p-3 text-xs font-medium border-t border-border">{fitBand}</div>,
                ...categories.map(c => {
                  const items = filtered.filter(o => (o.category === c) && (o.fit_rating ?? "").toLowerCase().startsWith(fitBand.toLowerCase()));
                  return (
                    <div key={fitBand+c} className="p-2 border-t border-l border-border text-[11px] space-y-1 min-h-16">
                      {items.map(i => <div key={i.id} className="truncate" title={i.name}>{i.name}</div>)}
                    </div>
                  );
                })
              ])}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graph" className="mt-6">
          <Card><CardContent className="p-6">
            <NetworkGraph orgs={filtered} categories={categories} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NetworkGraph({ orgs, categories }: { orgs: OrgRow[]; categories: string[] }) {
  const width = 900, height = 520, cx = width / 2, cy = height / 2;
  const catAngle = (i: number) => (i / Math.max(1, categories.length)) * Math.PI * 2;
  const catPos = categories.map((_, i) => ({ x: cx + Math.cos(catAngle(i)) * 200, y: cy + Math.sin(catAngle(i)) * 180 }));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[520px]">
      <circle cx={cx} cy={cy} r={42} fill="#0F766E" />
      <text x={cx} y={cy+4} textAnchor="middle" fill="#ffffff" fontSize="12" fontFamily="Cormorant Garamond, serif">Alice Lane</text>
      {categories.map((c, i) => (
        <g key={c}>
          <line x1={cx} y1={cy} x2={catPos[i].x} y2={catPos[i].y} stroke="#0F766E" strokeWidth={1} opacity={0.35} />
          <circle cx={catPos[i].x} cy={catPos[i].y} r={22} fill="#14B8A6" />
          <text x={catPos[i].x} y={catPos[i].y+3} textAnchor="middle" fill="#0f172a" fontSize="9">{c.slice(0,10)}</text>
        </g>
      ))}
      {orgs.map((o) => {
        const ci = Math.max(0, categories.indexOf(o.category ?? ""));
        const base = catPos[ci] ?? { x: cx, y: cy };
        const cluster = orgs.filter(x => x.category === o.category);
        const localIdx = cluster.indexOf(o);
        const a = (localIdx / Math.max(1, cluster.length)) * Math.PI * 2;
        const x = base.x + Math.cos(a) * 55, y = base.y + Math.sin(a) * 55;
        const r = 4 + fitScore(o.fit_rating) / 25;
        return (
          <g key={o.id}>
            <line x1={base.x} y1={base.y} x2={x} y2={y} stroke="#94a3b8" strokeOpacity={0.35} strokeWidth={1} />
            <circle cx={x} cy={y} r={r} fill="#0F766E"><title>{o.name} — {o.fit_rating ?? ""}</title></circle>
          </g>
        );
      })}
    </svg>
  );
}
