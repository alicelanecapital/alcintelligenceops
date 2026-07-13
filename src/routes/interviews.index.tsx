import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { listInterviews } from "@/lib/interviews";
import { fetchFounders } from "@/lib/db";
import { fetchUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import { fetchTeamMembers } from "@/lib/team-members";
import { COLOR_CLASSES, DEFAULT_COLOR_CLASSES } from "@/lib/team-member-colors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Radio, Play, CalendarClock, MapPin, Video } from "lucide-react";
import { startInterview } from "@/lib/interviews.functions";
import { toast } from "sonner";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";
import { format } from "date-fns";

export const Route = createFileRoute("/interviews/")({ component: () => <AppShell><InterviewsIndex /></AppShell> });

function InterviewsIndex() {
  const q = useQuery({ queryKey: ["interviews"], queryFn: listInterviews });
  const upcoming = useQuery({ queryKey: ["upcoming-calendar-meetings"], queryFn: fetchUpcomingGoogleCalendarEvents });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });
  const [view, setView] = useViewMode("meetings");

  const memberByEmail = new Map((members.data ?? []).map((m) => [m.email, m]));

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      <PageHeader
        eyebrow="Diagnostic Engine"
        title="Meetings"
        description="Founder meetings recorded, transcribed and analysed in real time. Every conversation builds Alice Lane's institutional knowledge."
        actions={<NewInterview />}
      />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="font-serif text-lg">Upcoming meetings</div>
          <SyncGoogleButton />
        </div>
        {upcoming.data && upcoming.data.length > 0 ? (
          <div className="rounded-lg border border-border divide-y divide-border bg-card">
            {upcoming.data.slice(0, 8).map((ev: any) => {
              const owner = memberByEmail.get(ev.user_email);
              const classes = owner ? COLOR_CLASSES[owner.color] : DEFAULT_COLOR_CLASSES;
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 text-sm border-l-4 ${classes.border}`}>
                  <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>{format(new Date(ev.start_time), "EEE d MMM · HH:mm")}</span>
                      {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                      {ev.meeting_link && <a href={ev.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline"><Video className="h-3 w-3" />Join</a>}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${classes.badge}`}>
                    {owner?.display_name || ev.user_email}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-card">
            No synced calendar meetings yet. Click "Sync Google" above to connect and sync your calendar.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="font-serif text-lg">Founder interviews</div>
        <ViewToggle mode={view} onChange={setView} />
      </div>

      {view === "card" ? (
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
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {(q.data ?? []).map((i: any) => (
            <Link key={i.id} to="/interviews/$id" params={{ id: i.id }}>
              <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-base leading-tight truncate">{i.founder_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{i.business_name} · {i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            </Link>
          ))}
          {q.isSuccess && !q.data?.length && (
            <div className="p-12 text-center bg-card">
              <div className="font-serif text-xl">No meetings yet</div>
              <p className="text-sm text-muted-foreground mt-2">Start your first founder meeting to build the memo.</p>
            </div>
          )}
        </div>
      )}
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
