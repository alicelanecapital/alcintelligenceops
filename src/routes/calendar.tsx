import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/db";
import { fetchAllMeetings, fetchAllTasks } from "@/lib/founders-data";
import { getOrCreateBookingLink } from "@/lib/booking.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Copy, CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, format, parseISO,
} from "date-fns";

export const Route = createFileRoute("/calendar")({ component: () => <AppShell><CalendarScreen /></AppShell> });

type CalItem = { id: string; date: Date; label: string; type: "event" | "meeting" | "task"; sub?: string };

const TYPE_STYLES: Record<CalItem["type"], string> = {
  event: "bg-teal-100 text-teal-800",
  meeting: "bg-blue-100 text-blue-800",
  task: "bg-amber-100 text-amber-800",
};

function BookingLinkCard() {
  const getLinkFn = useServerFn(getOrCreateBookingLink);
  const q = useQuery({ queryKey: ["booking-link"], queryFn: () => getLinkFn() });
  const url = q.data ? `${window.location.origin}/book/${(q.data as any).slug}` : null;

  return (
    <Card className="mt-6">
      <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
          <div>
            <div className="font-medium text-sm">Your booking link</div>
            <div className="text-xs text-muted-foreground">Share this so clients can see your open slots and book a session directly.</div>
          </div>
        </div>
        {url ? (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1.5 rounded border border-border max-w-[260px] truncate">{url}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{q.isLoading ? "Creating your link…" : ""}</span>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarScreen() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const meetings = useQuery({ queryKey: ["all-meetings"], queryFn: fetchAllMeetings });
  const tasks = useQuery({ queryKey: ["all-tasks"], queryFn: fetchAllTasks });

  const items: CalItem[] = useMemo(() => {
    const out: CalItem[] = [];
    (events.data ?? []).forEach((e: any) => {
      if (!e.start_date) return;
      out.push({ id: `event-${e.id}`, date: parseISO(e.start_date), label: e.name, type: "event", sub: [e.city, e.country].filter(Boolean).join(", ") });
    });
    (meetings.data ?? []).forEach((m: any) => {
      if (!m.meeting_date) return;
      out.push({ id: `meeting-${m.id}`, date: new Date(m.meeting_date), label: m.title ?? "Meeting", type: "meeting", sub: m.founder?.name ?? m.company?.name });
    });
    (tasks.data ?? []).forEach((t: any) => {
      if (!t.due_date || t.status === "Done") return;
      out.push({ id: `task-${t.id}`, date: parseISO(t.due_date), label: t.title, type: "task", sub: t.assignee });
    });
    return out;
  }, [events.data, meetings.data, tasks.data]);

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const itemsForDay = (day: Date) => items.filter((it) => isSameDay(it.date, day));
  const selectedItems = selectedDay ? itemsForDay(selectedDay).sort((a, b) => a.date.getTime() - b.date.getTime()) : [];

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Planning"
        title="Calendar"
        description="Events, meetings, and task due dates in one place."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="icon" variant="outline" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-serif text-lg w-40 text-center">{format(month, "MMMM yyyy")}</div>
            <Button size="icon" variant="outline" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => { setMonth(new Date()); setSelectedDay(new Date()); }}>Today</Button>
          </div>
        }
      />

      <BookingLinkCard />

      <div className="flex gap-3 mb-4 mt-6 text-xs">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Events</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Meetings</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Tasks due</span>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="bg-muted/50 text-center text-[11px] uppercase tracking-wider text-muted-foreground py-2">{d}</div>
        ))}
        {days.map((day) => {
          const dayItems = itemsForDay(day);
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());
          const selected = selectedDay && isSameDay(day, selectedDay);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`bg-card text-left p-2 min-h-[92px] hover:bg-muted/40 transition-colors ${!inMonth ? "opacity-40" : ""} ${selected ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <div className={`text-xs mb-1 ${today ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <div key={it.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${TYPE_STYLES[it.type]}`}>{it.label}</div>
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
                  <div key={it.id} className="flex items-center gap-3 text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide ${TYPE_STYLES[it.type]}`}>{it.type}</span>
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
