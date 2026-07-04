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
import { Mail, Phone, Globe } from "lucide-react";
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
                    {f.referral_source && <div className="mt-2 text-[11px] text-muted-foreground">Referral: {f.referral_source}</div>}
                    {/* Contact Details */}
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {f.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> <a href={`mailto:${f.email}`} className="text-primary hover:underline text-[10px]">{f.email}</a></div>}
                      {f.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> <span className="text-[10px]">{f.phone}</span></div>}
                      {f.website && <div className="flex items-center gap-2"><Globe className="h-3 w-3 text-muted-foreground" /> <a href={f.website} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px] truncate">{f.website}</a></div>}
                      {f.description && <div className="text-[10px] text-muted-foreground italic line-clamp-2 mt-2">{f.description}</div>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Startup</TableHead><TableHead>Sector</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium"><Link to="/founders/$id" params={{ id: f.id }} className="text-primary hover:underline">{f.name}</Link></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{f.startup_name}</TableCell>
                    <TableCell className="text-xs">{f.sector ? <Badge variant="outline" className="text-[10px]">{f.sector}</Badge> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.email ? <a href={`mailto:${f.email}`} className="text-primary hover:underline">{f.email}</a> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.phone ?? "—"}</TableCell>
                    <TableCell className="text-xs">{f.stage ? <Badge variant="outline" className="text-[10px]">{f.stage}</Badge> : "—"}</TableCell>
                    <TableCell className="text-xs">{f.ai_investment_score ?? "—"}</TableCell>
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
