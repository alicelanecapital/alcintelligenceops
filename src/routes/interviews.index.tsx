import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInterviews, setInterviewPrivate, dismissInterview, stopInterview } from "@/lib/interviews";
import { fetchFounders, fetchEvents } from "@/lib/db";
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
import { Radio, Play, CalendarClock, MapPin, Video, X, Lock, Unlock, StopCircle } from "lucide-react";
import { startInterview } from "@/lib/interviews.functions";
import { NewMeetingDialog } from "@/components/NewMeetingDialog";
import { toast } from "sonner";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { format } from "date-fns";


export const Route = createFileRoute("/interviews/")({ component: () => <AppShell><InterviewsIndex /></AppShell> });

/** The same real-world event often appears more than once because several team
 * members' synced calendars (and shared/subscribed calendars) all pick it up
 * independently -- collapse to one row per title + start time. */
const HOLIDAY_TITLE_PATTERNS = [
  "holiday", "heritage day", "freedom day", "youth day", "workers' day", "workers day",
  "christmas", "boxing day", "new year", "good friday", "family day", "human rights day",
  "women's day", "womens day", "day of reconciliation", "day of goodwill",
];

function isHoliday(ev: any): boolean {
  const title = (ev.title ?? "").toLowerCase();
  const organizer = (ev.organizer_email ?? ev.organizer ?? "").toLowerCase();
  const calendarId = (ev.calendar_id ?? "").toLowerCase();
  const calendarName = (ev.calendar_name ?? "").toLowerCase();
  if (calendarId.endsWith("holiday.calendar.google.com")) return true;
  if (calendarId.includes("#holiday@")) return true;
  if (calendarId.includes("holiday")) return true;
  if (calendarName.includes("holiday")) return true;
  if (organizer.includes("holiday@group.v.calendar.google.com")) return true;
  return HOLIDAY_TITLE_PATTERNS.some((p) => title.includes(p));
}

function dedupeEvents(events: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const ev of events) {
    if (isHoliday(ev)) continue;
    // Include the google event id so distinct entries (across sub-calendars / teammates)
    // aren't collapsed just because the title + start_time coincide.
    const key = `${(ev.google_event_id ?? ev.id ?? "")}|${(ev.title ?? "").trim().toLowerCase()}|${ev.start_time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

const INTERNAL_DOMAIN = "alicelanecapital.com";
function classifyCalendarEvent(ev: any): "private" | "client" {
  const attendees: any[] = ev.attendees ?? [];
  const externals = attendees
    .map((a) => (a?.email ?? "").toLowerCase())
    .filter((e) => e && !e.endsWith(`@${INTERNAL_DOMAIN}`) && !e.includes("resource.calendar.google.com"));
  return externals.length === 0 ? "private" : "client";
}

function InterviewsIndex() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["interviews"], queryFn: listInterviews });
  const upcoming = useQuery({ queryKey: ["upcoming-calendar-meetings"], queryFn: fetchUpcomingGoogleCalendarEvents });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });
  const eventsQ = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
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

  const stopMut = useMutation({
    mutationFn: (id: string) => stopInterview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Meeting stopped");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to stop"),
  });


  const clientInterviews = (q.data ?? []).filter((i: any) => !i.is_private);
  const privateInterviews = (q.data ?? []).filter((i: any) => i.is_private);
  const calendarClient = dedupedUpcoming.filter((ev) => classifyCalendarEvent(ev) === "client");
  const calendarPrivate = dedupedUpcoming.filter((ev) => classifyCalendarEvent(ev) === "private");
  const todayIso = new Date().toISOString().slice(0, 10);
  const bookedEvents = (eventsQ.data ?? []).filter((e: any) => {
    if (!e.booked || e.rejected) return false;
    const end = e.end_date ?? e.start_date;
    return !end || end >= todayIso;
  });

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      <PageHeader
        eyebrow="Diagnostic Engine"
        title="Meetings"
        description="Founder meetings recorded, transcribed and analysed in real time. Every conversation builds Alice Lane's institutional knowledge."
        actions={<div className="flex items-center gap-2"><SyncGoogleButton mode="team" /><NewInterview /></div>}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="font-serif text-lg">Founder interviews</div>
        <ViewToggle mode={view} onChange={setView} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <InterviewColumn
          title="Client meetings"
          items={clientInterviews}
          calendarEvents={calendarClient}
          memberByEmail={memberByEmail}
          view={view}
          emptyText="No client meetings yet. Start your first founder meeting to build the memo."
          onTogglePrivate={(i) => togglePrivateMut.mutate({ id: i.id, isPrivate: true })}
          onDismiss={(i) => dismissMut.mutate(i.id)}
        />
        <InterviewColumn
          title="Private meetings"
          items={privateInterviews}
          calendarEvents={calendarPrivate}
          memberByEmail={memberByEmail}
          view={view}
          emptyText="No private meetings."
          onTogglePrivate={(i) => togglePrivateMut.mutate({ id: i.id, isPrivate: false })}
          onDismiss={(i) => dismissMut.mutate(i.id)}
        />
      </div>

      <div className="mb-2">
        <div className="text-sm font-medium text-muted-foreground mb-2">Events ({bookedEvents.length})</div>
        {bookedEvents.length === 0 ? (
          <div className="p-6 text-center bg-card rounded-lg">
            <p className="text-sm text-muted-foreground">No upcoming booked events. Book an event from the Events screen to see it here.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg">
            {bookedEvents.map((ev: any) => (
              <Link key={ev.id} to="/events" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0">
                <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{ev.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {ev.start_date ? format(new Date(ev.start_date), "d MMM yyyy") : "—"}
                    {ev.end_date && ev.end_date !== ev.start_date && ` – ${format(new Date(ev.end_date), "d MMM yyyy")}`}
                    {ev.location && ` · ${ev.location}`}
                  </div>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-700">Booked</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}


function InterviewColumn({ title, items, calendarEvents, memberByEmail, view, emptyText, onTogglePrivate, onDismiss }: {
  title: string;
  items: any[];
  calendarEvents: any[];
  memberByEmail: Map<string, any>;
  view: "card" | "list";
  emptyText: string;
  onTogglePrivate: (i: any) => void;
  onDismiss: (i: any) => void;
}) {
  const isPrivateColumn = title === "Private meetings";
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground mb-2">{title} ({items.length + calendarEvents.length})</div>
      {view === "card" ? (
        <div className="grid gap-3">
          {items.map((i) => (
            <Card key={i.id} className="hover:border-primary/50 transition-colors relative group border-0 shadow-none bg-card">
              <button
                onClick={(e) => { e.preventDefault(); onDismiss(i); }}
                title="Dismiss from view"
                className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <CardContent className="p-5">
                <div className="flex items-start justify-between pr-6 gap-3">
                  <Link to="/interviews/$id" params={{ id: i.id }} className="flex-1 min-w-0">
                    <div className="font-serif text-lg leading-tight">{i.founder_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{i.business_name}</div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={i.status} />
                    <Link to="/interviews/$id" params={{ id: i.id }}>
                      <Button size="sm" className="h-7 px-2 gap-1"><Play className="h-3 w-3" /> Start</Button>
                    </Link>
                  </div>
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
            </Card>
          ))}
          {calendarEvents.map((ev) => (
            <CalendarEventRow key={ev.id} ev={ev} memberByEmail={memberByEmail} />
          ))}
          {!items.length && !calendarEvents.length && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center bg-card">
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 px-5 py-3 hover:bg-muted/40 transition-colors">
              <Link to="/interviews/$id" params={{ id: i.id }} className="flex-1 min-w-0">
                <div className="font-serif text-base leading-tight truncate">{i.founder_name}</div>
                <div className="text-xs text-muted-foreground truncate">{i.business_name} · {i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}</div>
              </Link>
              <StatusBadge status={i.status} />
              <Link to="/interviews/$id" params={{ id: i.id }}>
                <Button size="sm" className="h-7 px-2 gap-1"><Play className="h-3 w-3" /> Start</Button>
              </Link>
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
          {calendarEvents.map((ev) => (
            <CalendarEventRow key={ev.id} ev={ev} memberByEmail={memberByEmail} compact />
          ))}
          {!items.length && !calendarEvents.length && (
            <div className="p-8 text-center bg-card">
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarEventRow({ ev, memberByEmail, compact }: { ev: any; memberByEmail: Map<string, any>; compact?: boolean }) {
  const owner = memberByEmail.get(ev.user_email);
  const classes = owner ? (COLOR_CLASSES as any)[owner.color] : DEFAULT_COLOR_CLASSES;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm border-l-4 bg-card ${classes.border} ${compact ? "" : "rounded-md"}`}>
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{ev.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
          <span>{format(new Date(ev.start_time), "EEE d MMM · HH:mm")}</span>
          {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
          {ev.meeting_link && (
            <a href={ev.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline text-primary">
              <Video className="h-3 w-3" />Join
            </a>
          )}
        </div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${classes.badge}`}>
        {owner?.display_name || ev.user_email}
      </span>
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
