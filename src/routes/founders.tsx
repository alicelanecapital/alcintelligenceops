import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchFounders } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/founders")({ component: () => <AppShell><Founders /></AppShell> });

function Founders() {
  const q = useQuery({ queryKey: ["founders"], queryFn: fetchFounders });
  const [search, setSearch] = useState("");
  const list = (q.data ?? []).filter((f: any) => !search || `${f.name} ${f.sector ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="People" title="Founders" description="Every founder in the origination universe, with sector, stage and AI investment score." />
      <div className="mb-4 max-w-sm"><Input placeholder="Search founders…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif text-lg leading-tight">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.startup_name}</div>
                </div>
                {f.ai_investment_score && <Badge className="bg-[var(--gold)] text-[var(--ink)]">{f.ai_investment_score}</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {f.sector && <Badge variant="outline" className="text-[10px]">{f.sector}</Badge>}
                {f.stage && <Badge variant="outline" className="text-[10px]">{f.stage}</Badge>}
              </div>
              {f.referral_source && <div className="mt-3 text-[11px] text-muted-foreground">Referral: {f.referral_source}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
