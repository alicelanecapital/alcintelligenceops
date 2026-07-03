import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/relationship-map")({
  component: () => <AppShell><RelationshipMap /></AppShell>,
});

async function fetchGraph() {
  const [founders, companies, orgs, links] = await Promise.all([
    supabase.from("founders").select("id, name, sector").limit(200),
    supabase.from("companies").select("id, name, industry").limit(200),
    supabase.from("organisations").select("id, name, kind, category").limit(200),
    supabase.from("founder_companies").select("founder_id, company_id"),
  ]);
  return {
    founders: founders.data ?? [], companies: companies.data ?? [],
    orgs: orgs.data ?? [], links: links.data ?? [],
  };
}

function RelationshipMap() {
  const q = useQuery({ queryKey: ["graph"], queryFn: fetchGraph });
  const [hover, setHover] = useState<any>(null);

  const nodes = useMemo(() => {
    if (!q.data) return [];
    const founders = q.data.founders.map((f: any, i: number) => ({ ...f, kind: "founder", angle: (i / Math.max(1, q.data.founders.length)) * Math.PI * 2, ring: 240 }));
    const companies = q.data.companies.map((c: any, i: number) => ({ ...c, kind: "company", angle: (i / Math.max(1, q.data.companies.length)) * Math.PI * 2, ring: 380 }));
    const orgs = q.data.orgs.map((o: any, i: number) => ({ ...o, kind: o.kind === "sme" ? "sme" : "org", angle: (i / Math.max(1, q.data.orgs.length)) * Math.PI * 2, ring: 520 }));
    return [...founders, ...companies, ...orgs].map(n => ({ ...n, x: 620 + Math.cos(n.angle) * n.ring, y: 400 + Math.sin(n.angle) * n.ring }));
  }, [q.data]);

  const nodeById = useMemo(() => Object.fromEntries(nodes.map(n => [`${n.kind}:${n.id}`, n])), [nodes]);
  const edges = useMemo(() => {
    if (!q.data) return [];
    return q.data.links.map((l: any) => {
      const a = nodeById[`founder:${l.founder_id}`]; const b = nodeById[`company:${l.company_id}`];
      return a && b ? { a, b } : null;
    }).filter(Boolean) as any[];
  }, [q.data, nodeById]);

  const svgRef = useRef<SVGSVGElement>(null);
  const colors: Record<string, string> = { founder: "hsl(var(--primary))", company: "#6366f1", org: "#0f766e", sme: "#f59e0b" };

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <PageHeader eyebrow="Intelligence" title="Global Relationship Map" description="Founders, companies, ecosystem organisations and their connections. Click any node to open its profile." />
      <Card><CardContent className="p-4">
        <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
          {Object.entries(colors).map(([k, c]) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>)}
        </div>
        <div className="relative">
          <svg ref={svgRef} viewBox="0 0 1240 820" className="w-full h-[720px] bg-muted/20 rounded">
            {edges.map((e, i) => <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="hsl(var(--border))" strokeWidth={1} />)}
            {nodes.map(n => {
              const to = n.kind === "founder" ? "/founders/$id" : n.kind === "company" ? "/companies/$id" : "/ecosystem";
              return (
                <Link key={`${n.kind}:${n.id}`} to={to as any} params={n.kind === "founder" || n.kind === "company" ? { id: n.id } : undefined}>
                  <g onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
                    <circle cx={n.x} cy={n.y} r={n.kind === "founder" ? 6 : 4} fill={colors[n.kind]} />
                  </g>
                </Link>
              );
            })}
          </svg>
          {hover && (
            <div className="absolute top-3 right-3 bg-card border rounded-md px-3 py-2 shadow-sm text-xs">
              <div className="uppercase tracking-widest text-[10px] text-muted-foreground">{hover.kind}</div>
              <div className="font-medium">{hover.name}</div>
              <div className="text-muted-foreground">{hover.sector ?? hover.industry ?? hover.category ?? ""}</div>
            </div>
          )}
        </div>
      </CardContent></Card>
    </div>
  );
}
