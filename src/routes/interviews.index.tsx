import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { listInterviews } from "@/lib/interviews";
import { fetchFounders } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Radio, Play } from "lucide-react";
import { startInterview } from "@/lib/interviews.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/interviews/")({ component: () => <AppShell><InterviewsIndex /></AppShell> });

function InterviewsIndex() {
  const q = useQuery({ queryKey: ["interviews"], queryFn: listInterviews });
  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      <PageHeader
        eyebrow="Diagnostic Engine"
        title="Meetings"
        description="Founder meetings recorded, transcribed and analysed in real time. Every conversation builds Alice Lane's institutional knowledge."
        actions={<NewInterview />}
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(q.data ?? []).map((i: any) => (
          <Link key={i.id} to="/interviews/$id" params={{ id: i.id }}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-serif text-lg leading-tight">{i.founder_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{i.business_name}</div>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {q.isSuccess && !q.data?.length && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center bg-card">
            <div className="font-serif text-xl">No meetings yet</div>
            <p className="text-sm text-muted-foreground mt-2">Start your first founder meeting to build the memo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") return <Badge className="bg-red-600 text-white gap-1"><Radio className="h-3 w-3" /> Live</Badge>;
  if (status === "completed") return <Badge variant="outline">Completed</Badge>;
  return <Badge variant="secondary" className="gap-1"><Play className="h-3 w-3" /> Draft</Badge>;
}

function NewInterview() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [founderId, setFounderId] = useState<string>("");
  const [founderName, setFounderName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [busy, setBusy] = useState(false);
  const founders = useQuery({ queryKey: ["founders"], queryFn: fetchFounders, enabled: open });

  async function submit() {
    setBusy(true);
    try {
      const row = await startInterview({ data: {
        founderId: founderId || undefined,
        founderName: founderName || undefined,
        businessName: businessName || undefined,
        industry: industry || undefined,
      }});
      toast.success("Brief generated");
      setOpen(false);
      nav({ to: "/interviews/$id", params: { id: (row as any).id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Start meeting</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New founder meeting</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Existing founder (optional)</Label>
            <select value={founderId} onChange={(e) => {
              setFounderId(e.target.value);
              const f = (founders.data ?? []).find((x: any) => x.id === e.target.value);
              if (f) { setFounderName(f.name); setBusinessName(f.startup_name ?? ""); setIndustry(f.sector ?? ""); }
            }} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Start blank —</option>
              {(founders.data ?? []).map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} · {f.startup_name}</option>
              ))}
            </select>
          </div>
          <div><Label>Founder name</Label><Input value={founderName} onChange={(e) => setFounderName(e.target.value)} className="mt-1" /></div>
          <div><Label>Business</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" /></div>
          <div><Label>Industry</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (!founderId && !founderName)}>
            {busy ? "Generating brief…" : "Create & open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
