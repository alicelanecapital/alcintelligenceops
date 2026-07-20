import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInterviews, setInterviewPrivate, dismissInterview } from "@/lib/interviews";
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
import { Radio, Play, CalendarClock, MapPin, Video, X, Lock, Unlock } from "lucide-react";
import { startInterview } from "@/lib/interviews.functions";
import { toast } from "sonner";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { format } from "date-fns";

export const Route = createFileRoute("/interviews/")({ component: () => <AppShell><InterviewsIndex /></AppShell> });

/** The same real-world event often appears more than once because several team
 * members' synced calendars (and shared/subscribed calendars) all pick it up
 * independently -- collapse to one row per title + start time. */
function dedupeEvents(events: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const ev of events) {
    // Filter public holidays out of the Meetings screen — they belong on the Calendar
    // (where they render as pastel-shaded background cells), not in this list.
    const title = (ev.title ?? "").toLowerCase();
    const organizer = (ev.organizer_email ?? ev.organizer ?? "").toLowerCase();
    const calendarId = (ev.calendar_id ?? "").toLowerCase();
    const looksLikeHoliday =
      calendarId.includes("holiday") ||
      organizer.includes("holiday@group.v.calendar.google.com") ||
      /\b(public holiday|holiday)\b/.test(title);
    if (looksLikeHoliday) continue;
    const key = `${(ev.title ?? "").trim().toLowerCase()}|${ev.start_time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

function InterviewsIndex() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["interviews"], queryFn: listInterviews });
  const upcoming = useQuery({ queryKey: ["upcoming-calendar-meetings"], queryFn: fetchUpcomingGoogleCalendarEvents });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });
  const [view, setView] = useViewMode("meetings");

  const memberByEmail = new Map((members.data ?? []).map((m) => [m.email, m]));
  const dedupedUpcoming = dedupeEvents(upcoming.data ?? []);

  const togglePrivateMut = useMutation({
    mutationFn: ({ id, isPrivate }: { id: string; isPrivate: boolean }) => setInterviewPrivate(id, isPrivate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interviews"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => dismissInterview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Removed from view");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to dismiss"),
  });

  const clientMeetings = (q.data ?? []).filter((i: any) => !i.is_private);
  const privateMeetings = (q.data ?? []).filter((i: any) => i.is_private);

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      <PageHeader
        eyebrow="Diagnostic Engine"
        title="Meetings"
        description="Founder meetings recorded, transcribed and analysed in real time. Every conversation builds Alice Lane's institutional knowledge."
        actions={<NewInterview />}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="font-serif text-lg">Founder interviews</div>
        <ViewToggle mode={view} onChange={setView} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <InterviewColumn
          title="Client meetings"
          items={clientMeetings}
          view={view}
          emptyText="No client meetings yet. Start your first founder meeting to build the memo."
          onTogglePrivate={(i) => togglePrivateMut.mutate({ id: i.id, isPrivate: true })}
          onDismiss={(i) => dismissMut.mutate(i.id)}
        />
        <InterviewColumn
          title="Private meetings"
          items={privateMeetings}
          view={view}
          emptyText="No private meetings."
          onTogglePrivate={(i) => togglePrivateMut.mutate({ id: i.id, isPrivate: false })}
          onDismiss={(i) => dismissMut.mutate(i.id)}
        />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="font-serif text-lg">Events</div>
        </div>
        {dedupedUpcoming.length > 0 ? (
          <div className="rounded-lg border border-border divide-y divide-border bg-card">
            {dedupedUpcoming.slice(0, 8).map((ev: any) => {
              // A shared calendar (e.g. Tendai's, synced into whoever's account subscribes to it) is
              // identified by calendar name/id rather than by whose Google account did the syncing --
              // shown in a solid red/white treatment regardless of the syncing account's own colour.
              const isTendaiCalendar = [ev.calendar_name, ev.calendar_id].some((v) => (v ?? "").toLowerCase().includes("tendai"));
              const owner = memberByEmail.get(ev.user_email);
              const classes = owner ? COLOR_CLASSES[owner.color] : DEFAULT_COLOR_CLASSES;
              return (
                <div
                  key={ev.id}
                  className={
                    isTendaiCalendar
                      ? "flex items-center gap-3 px-4 py-3 text-sm border-l-4 border-l-red-800 bg-red-600 text-white"
                      : `flex items-center gap-3 px-4 py-3 text-sm border-l-4 ${classes.border}`
                  }
                >
                  <CalendarClock className={`h-4 w-4 shrink-0 ${isTendaiCalendar ? "text-white" : "text-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className={`text-xs flex items-center gap-3 flex-wrap ${isTendaiCalendar ? "text-white/90" : "text-muted-foreground"}`}>
                      <span>{format(new Date(ev.start_time), "EEE d MMM · HH:mm")}</span>
                      {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                      {ev.meeting_link && (
                        <a href={ev.meeting_link} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 underline ${isTendaiCalendar ? "text-white" : "text-primary"}`}>
                          <Video className="h-3 w-3" />Join
                        </a>
                      )}
                    </div>
                  </div>
                  <span
                    className={
                      isTendaiCalendar
                        ? "text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap bg-red-800 text-white"
                        : `text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${classes.badge}`
                    }
                  >
                    {isTendaiCalendar ? "Tendai" : (owner?.display_name || ev.user_email)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-card">
            No synced calendar events yet. Connect a Google account in Accounts to sync your calendar.
          </div>
        )}
      </div>

    </div>
  );
}

function InterviewColumn({ title, items, view, emptyText, onTogglePrivate, onDismiss }: {
  title: string;
  items: any[];
  view: "card" | "list";
  emptyText: string;
  onTogglePrivate: (i: any) => void;
  onDismiss: (i: any) => void;
}) {
  const isPrivateColumn = title === "Private meetings";
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground mb-2">{title} ({items.length})</div>
      {view === "card" ? (
        <div className="grid gap-3">
          {items.map((i) => (
            <Card key={i.id} className="hover:border-primary/50 transition-colors relative group">
              <button
                onClick={(e) => { e.preventDefault(); onDismiss(i); }}
                title="Dismiss from view"
                className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Link to="/interviews/$id" params={{ id: i.id }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between pr-6">
                    <div>
                      <div className="font-serif text-lg leading-tight">{i.founder_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{i.business_name}</div>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); onTogglePrivate(i); }}
                      title={isPrivateColumn ? "Mark as client meeting" : "Mark as private"}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {isPrivateColumn ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {isPrivateColumn ? "Mark client" : "Mark private"}
                    </button>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
          {!items.length && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center bg-card">
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 px-5 py-3 hover:bg-muted/40 transition-colors">
              <Link to="/interviews/$id" params={{ id: i.id }} className="flex-1 min-w-0">
                <div className="font-serif text-base leading-tight truncate">{i.founder_name}</div>
                <div className="text-xs text-muted-foreground truncate">{i.business_name} · {i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}</div>
              </Link>
              <StatusBadge status={i.status} />
              <button
                onClick={() => onTogglePrivate(i)}
                title={isPrivateColumn ? "Mark as client meeting" : "Mark as private"}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              >
                {isPrivateColumn ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => onDismiss(i)}
                title="Dismiss from view"
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {!items.length && (
            <div className="p-8 text-center bg-card">
              <p className="text-sm text-muted-foreground">{emptyText}</p>
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
