import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/events")({ component: () => <AppShell><Events /></AppShell> });

function Events() {
  const q = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Events"
        description="AI-curated events worth attending — ranked by strategic fit for your origination thesis."
        actions={<Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Sparkles className="h-4 w-4 mr-2" /> Run discovery</Button>}
      />
      {(q.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
          <Sparkles className="h-8 w-8 mx-auto text-primary" />
          <h3 className="font-serif text-2xl mt-3">No events discovered yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Trigger the AI event-discovery run to scan SA startup, VC and MSME calendars. Each event will be scored on audience fit, cost and strategic value.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Event</TableHead><TableHead>Location</TableHead><TableHead>Date</TableHead>
              <TableHead>Cost</TableHead><TableHead>AI Score</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.city}, {e.country}</TableCell>
                  <TableCell className="text-muted-foreground">{e.start_date}</TableCell>
                  <TableCell className="text-muted-foreground">{e.cost}</TableCell>
                  <TableCell><Badge className="bg-primary text-primary-foreground">{e.ai_score ?? "—"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
