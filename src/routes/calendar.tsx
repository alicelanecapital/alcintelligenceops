import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/db";
import { fetchAllMeetings } from "@/lib/founders-data";
import { fetchAllTeamCalendarEvents } from "@/lib/google-calendar";
import { fetchTeamMembers, TEAM_MEMBER_COLORS, type TeamMember, type TeamMemberColor } from "@/lib/team-members";
import { COLOR_CLASSES, DEFAULT_COLOR_CLASSES } from "@/lib/team-member-colors";
import { supabase } from "@/integrations/supabase/client";
import type { ContactCategory } from "@/lib/contact-colors";
import { useAuth } from "@/lib/auth";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  setGoogleEventStatus,
  setInterviewStatus,
  setEventStatus,
  deleteInterviewRow,
  deleteEventRow,
  listWritableCalendars,
} from "@/lib/google-calendar-crud.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Ban, Plus, Pencil, Trash2 } from "lucide-react";

import { useMemo, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, format, parseISO,
} from "date-fns";

export const Route = createFileRoute("/calendar")({ component: () => <AppShell><CalendarScreen /></AppShell> });

type Status = "done" | "cancelled" | "postponed" | null;

type CalItem = {
  id: string;
  date: Date;
  endDate?: Date;
  label: string;
  type: "event" | "meeting" | "holiday";
  sub?: string;
  category?: ContactCategory;
  owner?: string;
  hasTime?: boolean;
  busy?: boolean;
  status?: Status;
  /** For selected-day panel editing. */
  googleEventId?: string;
  calendarId?: string;
  location?: string | null;
  description?: string | null;
  sourceTable?: "google_calendar_events" | "interviews" | "events";
  sourceId?: string;
};

const FALLBACK_COLORS: TeamMemberColor[] = TEAM_MEMBER_COLORS;
function hashColor(email: string): TeamMemberColor {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

const BUSY_TOKENS = ["(smartify)", "(nonastasia)", "(georgiaadams)"];
function isBusy(title: string | null | undefined): boolean {
  const t = (title ?? "").toLowerCase();
  return BUSY_TOKENS.some((tok) => t.includes(tok));
}

/** Per-teammate override for the busy-chip initials. */
const BUSY_INITIALS: Record<string, string> = {
  "georgia@alicelanecapital.co.za": "GA",
};
function initialsFromEmail(email?: string): string {
  if (!email) return "??";
  const key = email.toLowerCase();
  if (BUSY_INITIALS[key]) return BUSY_INITIALS[key];
  const local = key.split("@")[0] ?? key;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function timeRange(it: CalItem): string {
  if (!it.hasTime) return "";
  const start = format(it.date, "HH:mm");
  if (it.endDate && it.endDate.getTime() > it.date.getTime()) {
    return `${start}–${format(it.endDate, "HH:mm")}`;
  }
  return start;
}

function CalendarScreen() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedDayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedDay && selectedDayRef.current) {
      selectedDayRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedDay]);

  const { user } = useAuth();
  const myEmail = (user?.email ?? "").toLowerCase();
  const qc = useQueryClient();

  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const meetings = useQuery({ queryKey: ["all-meetings"], queryFn: fetchAllMeetings });
  // Tasks intentionally not shown on the calendar.

  const interviews = useQuery({
    queryKey: ["cal-interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("id, title, created_at, status, contact:contacts(id, name, category)")
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const holidays = useQuery({
    queryKey: ["cal-holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_events")
        .select("id, title, start_time, calendar_id, organizer_email")
        .or("calendar_id.ilike.%holiday%,organizer_email.ilike.%holiday@%,title.ilike.%holiday%")
        .limit(200);
      if (error) return [];
      return data ?? [];
    },
  });

  const teamEvents = useQuery({
    queryKey: ["team-calendar-events"],
    queryFn: fetchAllTeamCalendarEvents,
  });

  const team = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });
  const colorByEmail = useMemo(() => {
    const m = new Map<string, TeamMemberColor>();
    for (const tm of (team.data ?? []) as TeamMember[]) m.set(tm.email.toLowerCase(), tm.color);
    return m;
  }, [team.data]);
  const resolveColor = (email?: string): TeamMemberColor => {
    if (!email) return "gray";
    return colorByEmail.get(email.toLowerCase()) ?? hashColor(email.toLowerCase());
  };

  const isHolidayRow = (r: any) => {
    const cal = (r.calendar_id ?? "").toLowerCase();
    const title = (r.title ?? "").toLowerCase();
    return cal.includes("holiday") || title.includes("holiday");
  };

  const items: CalItem[] = useMemo(() => {
    const out: CalItem[] = [];
    (events.data ?? []).forEach((e: any) => {
      if (!e.start_date) return;
      out.push({
        id: `event-${e.id}`, date: parseISO(e.start_date), label: e.name, type: "event",
        sub: [e.city, e.country].filter(Boolean).join(", "),
        status: (e.status ?? null) as Status, sourceTable: "events", sourceId: e.id,
      });
    });
    (meetings.data ?? []).forEach((m: any) => {
      if (!m.meeting_date) return;
      const d = new Date(m.meeting_date);
      const hasTime = /T\d/.test(String(m.meeting_date));
      out.push({ id: `meeting-${m.id}`, date: d, label: m.title ?? "Meeting", type: "meeting", sub: m.founder?.name ?? m.company?.name, hasTime });
    });
    (interviews.data ?? []).forEach((i: any) => {
      if (!i.created_at) return;
      const cat = (i.contact?.category ?? "unknown") as ContactCategory;
      out.push({
        id: `interview-${i.id}`, date: new Date(i.created_at), label: i.title ?? "Meeting",
        type: "meeting", sub: i.contact?.name, category: cat, hasTime: true,
        status: (i.status ?? null) as Status, sourceTable: "interviews", sourceId: i.id,
      });
    });
    const activeEmails = new Set<string>((team.data ?? []).map((tm: any) => String(tm.email).toLowerCase()));
    const seenGcal = new Set<string>();
    (teamEvents.data ?? []).forEach((g: any) => {
      if (!g.start_time || isHolidayRow(g)) return;
      const owner = String(g.user_email ?? "").toLowerCase();
      if (activeEmails.size > 0 && !activeEmails.has(owner)) return;
      // A calendar entry with no external (non-alicelanecapital) attendee is
      // treated as an event/personal block, not a meeting — hide it from the grid.
      const attendees: any[] = Array.isArray(g.attendees) ? g.attendees : [];
      const externals = attendees
        .map((a) => String(a?.email ?? "").toLowerCase())
        .filter((e) =>
          e &&
          !e.endsWith("@alicelanecapital.co.za") &&
          !e.endsWith("@alicelanecapital.com") &&
          !e.includes("resource.calendar.google.com"),
        );
      if (externals.length === 0) return;
      const dedupeKey = `${owner}::${g.start_time}::${String(g.title ?? "").trim().toLowerCase()}`;
      if (seenGcal.has(dedupeKey)) return;
      seenGcal.add(dedupeKey);
      const busy = isBusy(g.title);
      out.push({
        id: `gcal-${owner}-${g.google_event_id ?? g.title}-${g.start_time}`,
        date: new Date(g.start_time),
        endDate: g.end_time ? new Date(g.end_time) : undefined,
        label: busy ? initialsFromEmail(owner) : (g.title ?? ""),
        type: "meeting",
        sub: g.user_email,
        owner: g.user_email,
        hasTime: true,
        busy,
        status: (g.status ?? null) as Status,
        googleEventId: g.google_event_id,
        calendarId: g.calendar_id,
        location: g.location,
        description: g.description,
        sourceTable: "google_calendar_events",
      });
    });

    return out;
  }, [events.data, meetings.data, interviews.data, teamEvents.data, team.data]);

  const holidayByDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of (holidays.data ?? []) as any[]) {
      if (!h.start_time) continue;
      const key = format(new Date(h.start_time), "yyyy-MM-dd");
      if (!m.has(key)) m.set(key, h.title ?? "Holiday");
    }
    return m;
  }, [holidays.data]);

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const itemStyle = (it: CalItem): string => {
    if (it.type === "event") return "bg-teal-600 text-white rounded";
    if (it.type === "meeting" && it.owner) {
      const c = COLOR_CLASSES[resolveColor(it.owner)] ?? DEFAULT_COLOR_CLASSES;
      return c.badge;
    }
    return "text-foreground";
  };

  const statusClasses = (s: Status): string => {
    if (s === "cancelled") return "line-through opacity-60";
    if (s === "done") return "opacity-40";
    if (s === "postponed") return "italic";
    return "";
  };

  const itemsForDay = (day: Date) => items.filter((it) => isSameDay(it.date, day));
  const selectedItems = selectedDay ? itemsForDay(selectedDay).sort((a, b) => a.date.getTime() - b.date.getTime()) : [];

  const legendOwners = useMemo(() => {
    return ((team.data ?? []) as any[]).map((tm) => String(tm.email)).sort();
  }, [team.data]);

  // ------- CRUD state -------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CalItem | null>(null);
  const createFn = useServerFn(createGoogleCalendarEvent);
  const updateFn = useServerFn(updateGoogleCalendarEvent);
  const deleteFn = useServerFn(deleteGoogleCalendarEvent);
  const deleteInterviewFn = useServerFn(deleteInterviewRow);
  const deleteEventFn = useServerFn(deleteEventRow);
  const setGoogleStatusFn = useServerFn(setGoogleEventStatus);
  const setInterviewStatusFn = useServerFn(setInterviewStatus);
  const setEventStatusFn = useServerFn(setEventStatus);
  const listCalsFn = useServerFn(listWritableCalendars);

  const writableCals = useQuery({ queryKey: ["writable-calendars"], queryFn: () => listCalsFn(), staleTime: 5 * 60 * 1000 });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["team-calendar-events"] });
    qc.invalidateQueries({ queryKey: ["cal-interviews"] });
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const statusMut = useMutation({
    mutationFn: async ({ it, status }: { it: CalItem; status: Status }) => {
      if (it.sourceTable === "google_calendar_events" && it.googleEventId) {
        await setGoogleStatusFn({ data: { googleEventId: it.googleEventId, status } });
      } else if (it.sourceTable === "interviews" && it.sourceId) {
        await setInterviewStatusFn({ data: { interviewId: it.sourceId, status } });
      } else if (it.sourceTable === "events" && it.sourceId) {
        await setEventStatusFn({ data: { eventId: it.sourceId, status } });
      } else {
        throw new Error("Status not editable for this item");
      }
    },
    onSuccess: () => { toast.success("Status updated"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to update status"),
  });

  const deleteMut = useMutation({
    mutationFn: async (it: CalItem) => {
      if (it.sourceTable === "google_calendar_events" && it.googleEventId && it.calendarId) {
        await deleteFn({ data: { googleEventId: it.googleEventId, calendarId: it.calendarId } });
      } else if (it.sourceTable === "interviews" && it.sourceId) {
        await deleteInterviewFn({ data: { interviewId: it.sourceId } });
      } else if (it.sourceTable === "events" && it.sourceId) {
        await deleteEventFn({ data: { eventId: it.sourceId } });
      } else {
        throw new Error("Cannot delete this item");
      }
    },
    onSuccess: () => { toast.success("Deleted"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const canEdit = (it: CalItem) =>
    it.sourceTable === "google_calendar_events" && !!it.owner && it.owner.toLowerCase() === myEmail;

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Planning"
        title="Calendar"
        description="Events, meetings, and task due dates in one place."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <SyncGoogleButton mode="team" />
            <Button size="icon" variant="outline" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-serif text-lg w-40 text-center">{format(month, "MMMM yyyy")}</div>
            <Button size="icon" variant="outline" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={() => { setMonth(new Date()); setSelectedDay(new Date()); }}>Today</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 mt-6 text-xs items-center">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-50 border border-rose-200" /> Public holiday</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Event</span>
        <span className="inline-flex items-center gap-1"><Ban className="h-3 w-3 text-red-600" /> Busy</span>
        <span className="inline-flex items-center gap-1 line-through opacity-60">Cancelled</span>
        <span className="inline-flex items-center gap-1 opacity-40">Done</span>
        <span className="inline-flex items-center gap-1 italic">Postponed</span>

        {legendOwners.length > 0 && <span className="text-muted-foreground ml-1">Synced calendars:</span>}
        {legendOwners.map((email) => {
          const c = COLOR_CLASSES[resolveColor(email)] ?? DEFAULT_COLOR_CLASSES;
          return (
            <span key={email} className="inline-flex items-center gap-1">
              <span className={cn("h-2.5 w-2.5 rounded-sm", c.dot)} /> {email}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border" style={{ backgroundColor: "var(--calendar-grid)", borderColor: "var(--calendar-grid)" }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="bg-forest text-white text-center text-[11px] uppercase tracking-wider py-2 font-medium">{d}</div>
        ))}
        {days.map((day) => {
          const dayItems = itemsForDay(day);
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());
          const selected = selectedDay && isSameDay(day, selectedDay);
          const holiday = holidayByDay.get(format(day, "yyyy-MM-dd"));
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              title={holiday ?? undefined}
              className={cn(
                "text-left p-2 min-h-[128px] hover:bg-muted/40 transition-colors",
                holiday ? "bg-rose-50" : (inMonth ? "bg-card" : "bg-neutral-50"),
                selected && "ring-2 ring-primary ring-inset",
              )}
            >
              <div className={cn("text-xs mb-1 font-medium", today ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : (inMonth ? "text-forest" : "text-muted-foreground/60"))}>
                {format(day, "d")}
              </div>
              {holiday && <div className="text-[10px] text-rose-700 mb-1 truncate italic">{holiday}</div>}
              <div>
                {dayItems.slice(0, 3).map((it, i) => (
                  <div
                    key={it.id}
                    title={(it.busy ? `${it.owner} · Busy` : (it.sub ? `${it.label} — ${it.sub}` : it.label)) + (it.status ? ` · ${it.status}` : "")}
                    className={cn("text-[10px] px-0.5 py-0.5 truncate flex items-center gap-1", itemStyle(it), statusClasses(it.status ?? null), i > 0 && "border-t border-border/40")}
                  >
                    {it.busy && <Ban className="h-2.5 w-2.5 shrink-0 text-red-600" />}
                    {it.hasTime && <span className="font-medium tabular-nums">{timeRange(it)}</span>}
                    <span className="truncate">{it.label}</span>
                  </div>
                ))}
                {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <Card ref={selectedDayRef} className="mt-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif text-xl">{format(selectedDay, "EEEE, d MMMM yyyy")}</div>
              <Button size="sm" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> New event
              </Button>
            </div>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((it) => (
                  <div key={it.id} className={cn("flex items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0", statusClasses(it.status ?? null))}>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded uppercase tracking-wide inline-flex items-center gap-1", itemStyle(it))}>
                      {it.busy && <Ban className="h-2.5 w-2.5 text-red-600" />}
                      {it.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {it.hasTime && <span className="mr-2 text-muted-foreground tabular-nums">{timeRange(it)}</span>}
                        {it.busy ? `${initialsFromEmail(it.owner)} · Busy` : it.label}
                      </div>
                      {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                    </div>
                    {(it.sourceTable === "google_calendar_events" || it.sourceTable === "interviews" || it.sourceTable === "events") && (
                      <Select
                        value={it.status ?? "open"}
                        onValueChange={(v) => statusMut.mutate({ it, status: v === "open" ? null : (v as Status) })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="postponed">Postponed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex items-center gap-1">
                      {canEdit(it) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(it); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(it.sourceTable === "google_calendar_events" || it.sourceTable === "interviews" || it.sourceTable === "events") && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this?")) deleteMut.mutate(it); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editItem}
        selectedDay={selectedDay}
        writableCals={writableCals.data ?? []}
        onSubmit={async (payload) => {
          try {
            if (editItem?.googleEventId && editItem.calendarId) {
              const { calendarId: _drop, ...rest } = payload;
              void _drop;
              await updateFn({ data: { calendarId: editItem.calendarId, googleEventId: editItem.googleEventId, ...rest } });
              toast.success("Event updated");
            } else {
              await createFn({ data: payload });
              toast.success("Event created");
            }
            setDialogOpen(false);
            invalidateAll();
          } catch (e: any) {
            toast.error(e.message ?? "Save failed");
          }
        }}
      />
    </div>
  );
}

function EventDialog({
  open, onOpenChange, initial, selectedDay, writableCals, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: CalItem | null;
  selectedDay: Date | null;
  writableCals: { id: string; summary: string; primary: boolean }[];
  onSubmit: (payload: { calendarId: string; title: string; startISO: string; endISO: string; location?: string; description?: string }) => void;
}) {
  const defaultDay = selectedDay ?? new Date();
  const defaultStart = initial?.date ?? new Date(defaultDay.getFullYear(), defaultDay.getMonth(), defaultDay.getDate(), 9, 0);
  const defaultEnd = initial?.endDate ?? new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(initial?.label ?? "");
  const [start, setStart] = useState(format(defaultStart, "yyyy-MM-dd'T'HH:mm"));
  const [end, setEnd] = useState(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const primary = writableCals.find((c) => c.primary) ?? writableCals[0];
  const [calendarId, setCalendarId] = useState(initial?.calendarId ?? primary?.id ?? "primary");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.label ?? "");
    setStart(format(initial?.date ?? defaultStart, "yyyy-MM-dd'T'HH:mm"));
    setEnd(format(initial?.endDate ?? defaultEnd, "yyyy-MM-dd'T'HH:mm"));
    setLocation(initial?.location ?? "");
    setDescription(initial?.description ?? "");
    setCalendarId(initial?.calendarId ?? primary?.id ?? "primary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location ?? ""} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {!initial && writableCals.length > 0 && (
            <div>
              <Label>Calendar</Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {writableCals.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.summary}{c.primary ? " (primary)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground italic">Single-occurrence writes only; recurring events must be edited in Google Calendar.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!title.trim()) { toast.error("Title required"); return; }
              onSubmit({
                calendarId,
                title: title.trim(),
                startISO: new Date(start).toISOString(),
                endISO: new Date(end).toISOString(),
                location: location || undefined,
                description: description || undefined,
              });
            }}
          >
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
