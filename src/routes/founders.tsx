import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchFounders } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

export const Route = createFileRoute("/founders")({ component: () => <AppShell><Founders /></AppShell> });

function Founders() {
  const q = useQuery({ queryKey: ["founders"], queryFn: fetchFounders });
  const [search, setSearch] = useState("");
  const [viewType, setViewType] = useState<"cards" | "list">("cards");
  const list = (q.data ?? []).filter((f: any) => !search || `${f.name} ${f.sector ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader eyebrow="People" title="Founders" description="Every founder in the origination universe, with sector, stage and AI investment score." />
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <Input placeholder="Search founders…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant={viewType === "cards" ? "default" : "outline"} onClick={() => setViewType("cards")}>Cards</Button>
          <Button size="sm" variant={viewType === "list" ? "default" : "outline"} onClick={() => setViewType("list")}>List</Button>
        </div>
        <div className="text-xs text-muted-foreground w-full">{list.length} founders</div>
      </div>
      <div className="mt-6">
        {viewType === "cards" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((f: any) => (
              <Link key={f.id} to="/founders/$id" params={{ id: f.id }}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif text-lg leading-tight">{f.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{f.startup_name}</div>
                      </div>
                      {f.ai_investment_score && <Badge className="bg-primary text-primary-foreground">{f.ai_investment_score}</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {f.sector && <Badge variant="outline" className="text-[10px]">{f.sector}</Badge>}
                      {f.stage && <Badge variant="outline" className="text-[10px]">{f.stage}</Badge>}
                    </div>
                    {f.referral_source && <div className="mt-3 text-[11px] text-muted-foreground">Referral: {f.referral_source}</div>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Startup</TableHead><TableHead>Sector</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium"><Link to="/founders/$id" params={{ id: f.id }} className="text-primary hover:underline">{f.name}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{f.startup_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{f.sector}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{f.stage}</Badge></TableCell>
                    <TableCell>{f.ai_investment_score ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
