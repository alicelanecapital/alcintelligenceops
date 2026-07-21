import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/db";
import { fetchAllMeetings, fetchAllTasks } from "@/lib/founders-data";
import { fetchAllTeamCalendarEvents } from "@/lib/google-calendar";
import { fetchTeamMembers, TEAM_MEMBER_COLORS, type TeamMember, type TeamMemberColor } from "@/lib/team-members";
import { COLOR_CLASSES, DEFAULT_COLOR_CLASSES } from "@/lib/team-member-colors";
import { supabase } from "@/integrations/supabase/client";
import type { ContactCategory } from "@/lib/contact-colors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, format, parseISO,
} from "date-fns";

export const Route = createFileRoute("/calendar")({ component: () => <AppShell><CalendarScreen /></AppShell> });

type CalItem = {
  id: string;
  date: Date;
  label: string;
  type: "event" | "meeting" | "task" | "holiday";
  sub?: string;
  /** Only set for meetings — used to colour by contact category. */
  category?: ContactCategory;
  /** For synced Google events: the connected teammate's email (used for colour + legend). */
  owner?: string;
  /** True when start_time was a full timestamp (i.e. show HH:mm on the chip). */
  hasTime?: boolean;
};

const FALLBACK_COLORS: TeamMemberColor[] = TEAM_MEMBER_COLORS;
function hashColor(email: string): TeamMemberColor {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

// Hard-coded privacy mask: any Google event with these tokens in brackets in its
// title renders as "Unavailable" everywhere on the calendar (chip + hover tooltip).
const UNAVAILABLE_TOKENS = ["(smartify)", "(nonastasia)", "(georgiaadams)"];
function maskUnavailable(title: string | null | undefined): string {
  const t = (title ?? "").toLowerCase();
  return UNAVAILABLE_TOKENS.some((tok) => t.includes(tok)) ? "Unavailable" : (title ?? "");
}


// BookingLinkCard now lives in src/components/BookingLinkCard.tsx and is
// rendered on Admin → Accounts (below the Email Signature).


function CalendarScreen() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const meetings = useQuery({ queryKey: ["all-meetings"], queryFn: fetchAllMeetings });
  const tasks = useQuery({ queryKey: ["all-tasks"], queryFn: fetchAllTasks });

  // Pull calendar interviews + contact category so we can color-code meetings by contact type.
  const interviews = useQuery({
    queryKey: ["cal-interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("id, title, created_at, contact:contacts(id, name, category)")
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Public holidays: separate query so we can render them as a pastel background,
  // never as a foreground "meeting" pill.
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

  // All synced Google Calendar events across every connected teammate, so the
  // unified calendar reflects each account's real meetings (previously they only
  // showed on the Meetings screen).
  const teamEvents = useQuery({
    queryKey: ["team-calendar-events"],
    queryFn: fetchAllTeamCalendarEvents,
  });

  // Team roster — used to resolve a teammate's colour by email.
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
      out.push({ id: `event-${e.id}`, date: parseISO(e.start_date), label: e.name, type: "event", sub: [e.city, e.country].filter(Boolean).join(", ") });
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
      out.push({ id: `interview-${i.id}`, date: new Date(i.created_at), label: i.title ?? "Meeting", type: "meeting", sub: i.contact?.name, category: cat, hasTime: true });
    });
    (teamEvents.data ?? []).forEach((g: any) => {
      if (!g.start_time || isHolidayRow(g)) return; // holidays render as day background, not as a pill
      out.push({
        id: `gcal-${g.user_email}-${g.google_event_id ?? g.title}-${g.start_time}`,
        date: new Date(g.start_time),
        label: maskUnavailable(g.title),
        type: "meeting",
        sub: g.user_email,
        owner: g.user_email,
        hasTime: true,
      });
    });

    (tasks.data ?? []).forEach((t: any) => {
      if (!t.due_date || t.status === "Done") return;
      out.push({ id: `task-${t.id}`, date: parseISO(t.due_date), label: t.title, type: "task", sub: t.assignee });
    });
    return out;
  }, [events.data, meetings.data, tasks.data, interviews.data, teamEvents.data]);

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
    if (it.type === "task") return "text-orange-600";
    if (it.type === "meeting" && it.owner) {
      const c = COLOR_CLASSES[resolveColor(it.owner)] ?? DEFAULT_COLOR_CLASSES;
      return c.badge;
    }
    return "text-foreground";
  };


  const itemsForDay = (day: Date) => items.filter((it) => isSameDay(it.date, day));
  const selectedItems = selectedDay ? itemsForDay(selectedDay).sort((a, b) => a.date.getTime() - b.date.getTime()) : [];

  // Legend — emails that actually have events synced this window.
  const legendOwners = useMemo(() => {
    const emails = new Set<string>();
    for (const g of (teamEvents.data ?? []) as any[]) {
      if (!isHolidayRow(g) && g.user_email) emails.add(g.user_email);
    }
    return Array.from(emails).sort();
  }, [teamEvents.data]);

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

      {/* BookingLinkCard moved to Admin → Accounts (below the Email Signature). */}

      {/* Legend — public-holiday shading + core types + per-teammate colour swatches for synced Google events. */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 mt-6 text-xs items-center">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-50 border border-rose-200" /> Public holiday</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Event</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Task due</span>

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


      {/* Calendar grid — grid lines stay neutral (scoped local override of the global forest-green border colour). */}
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
                    title={it.sub ? `${it.label} — ${it.sub}` : it.label}
                    className={cn("text-[10px] px-0.5 py-0.5 truncate", itemStyle(it), i > 0 && "border-t border-border/40")}
                  >
                    {it.label}
                  </div>
                ))}

                {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <Card className="mt-6">
          <CardContent className="p-5">
            <div className="font-serif text-xl mb-3">{format(selectedDay, "EEEE, d MMMM yyyy")}</div>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded uppercase tracking-wide", itemStyle(it))}>{it.type}</span>
                    <div>
                      <div className="font-medium">{it.label}</div>
                      {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

