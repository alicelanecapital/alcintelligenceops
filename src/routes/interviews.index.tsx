import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { listInterviews } from "@/lib/interviews";
import { fetchUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import { fetchTeamMembers } from "@/lib/team-members";
import { COLOR_CLASSES, DEFAULT_COLOR_CLASSES } from "@/lib/team-member-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useMemo } from "react";
import { Play, CalendarClock, MapPin, Video } from "lucide-react";
import {
  format, startOfDay, subYears,
} from "date-fns";

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

// Titles containing any of these bracketed tokens are fully hidden on the Meetings screen
// (both Private and Events sections) — they are personal calendars we don't want surfaced.
const HIDDEN_BRACKET_TOKENS = ["(smartify)", "(nonastasia)", "(georgiaadams)"];
function isHiddenBracketed(title: string | null | undefined): boolean {
  const t = (title ?? "").toLowerCase();
  return HIDDEN_BRACKET_TOKENS.some((tok) => t.includes(tok));
}

function dedupeEvents(events: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const ev of events) {
    if (isHoliday(ev)) continue;
    if (isHiddenBracketed(ev.title)) continue;
    // Meetings must have at least one non-alicelanecapital attendee. Zero-attendee
    // entries are events/personal blocks and belong on the Events screen instead.
    if (!hasExternalAttendees(ev)) continue;
    const key = `${(ev.google_event_id ?? ev.id ?? "")}|${(ev.title ?? "").trim().toLowerCase()}|${ev.start_time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

const INTERNAL_DOMAINS = ["alicelanecapital.co.za", "alicelanecapital.com"];
function isInternalEmail(e: string): boolean {
  return INTERNAL_DOMAINS.some((d) => e.endsWith(`@${d}`));
}
function externalAttendees(ev: any): string[] {
  const attendees: any[] = ev.attendees ?? [];
  return attendees
    .map((a) => (a?.email ?? "").toLowerCase())
    .filter((e) => e && !isInternalEmail(e) && !e.includes("resource.calendar.google.com"));
}
function hasExternalAttendees(ev: any): boolean {
  return externalAttendees(ev).length > 0;
}

type Item = { kind: "interview" | "calendar"; when: Date; data: any };


function InterviewsIndex() {
  const q = useQuery({ queryKey: ["interviews"], queryFn: listInterviews });
  const upcoming = useQuery({ queryKey: ["upcoming-calendar-meetings"], queryFn: fetchUpcomingGoogleCalendarEvents });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });
  const memberByEmail = new Map((members.data ?? []).map((m) => [m.email, m]));

  const { planned, past } = useMemo(() => {
    const items: Item[] = [];
    for (const i of q.data ?? []) items.push({ kind: "interview", when: new Date(i.created_at), data: i });
    for (const ev of dedupeEvents(upcoming.data ?? [])) items.push({ kind: "calendar", when: new Date(ev.start_time), data: ev });
    const todayStart = startOfDay(new Date()).getTime();
    const oneYearAgo = subYears(new Date(), 1).getTime();
    const planned: Item[] = [];
    const past: Item[] = [];
    for (const it of items) {
      const t = it.when.getTime();
      if (t >= todayStart) planned.push(it);
      else if (t >= oneYearAgo) past.push(it);
    }
    planned.sort((a, b) => a.when.getTime() - b.when.getTime());
    past.sort((a, b) => b.when.getTime() - a.when.getTime());
    return { planned, past };
  }, [q.data, upcoming.data]);

  const renderRows = (items: Item[]) =>
    items.length === 0 ? (
      <div className="text-sm text-muted-foreground italic px-2 py-4">Nothing scheduled.</div>
    ) : (
      <div className="divide-y divide-border/40">
        {items.map((it) =>
          it.kind === "interview"
            ? <InterviewRow key={`i-${it.data.id}`} i={it.data} />
            : <CalendarEventRow key={`c-${it.data.id}`} ev={it.data} memberByEmail={memberByEmail} />
        )}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Discovery</div>
      <PageHeader
        title="Meetings"
        description="Founder engagements recorded, transcribed and analysed in real time. Every conversation builds Alice Lane's institutional knowledge."
        actions={<SyncGoogleButton mode="team" className="bg-green-700 hover:bg-green-800 text-white border-green-700 hover:border-green-800" />}
      />

      <Accordion type="multiple" defaultValue={["planned"]}>
        <AccordionItem value="planned" className="border-b border-border/40">
          <AccordionTrigger className="hover:no-underline py-3 text-green-800 font-semibold">
            <span>Planned Meetings <span className="text-muted-foreground text-xs ml-2 font-normal">({planned.length})</span></span>
          </AccordionTrigger>
          <AccordionContent>{renderRows(planned)}</AccordionContent>
        </AccordionItem>
        <AccordionItem value="past" className="border-b border-border/40">
          <AccordionTrigger className="hover:no-underline py-3 text-green-800 font-semibold">
            <span>Past Meetings <span className="text-muted-foreground text-xs ml-2 font-normal">({past.length})</span> <span className="text-muted-foreground text-[11px] ml-1 font-normal">— last 12 months</span></span>
          </AccordionTrigger>
          <AccordionContent>{renderRows(past)}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}


function InterviewRow({ i }: { i: any }) {
  return (
    <div className="flex items-center gap-3 px-2 py-3 hover:bg-muted/40 transition-colors">
      <Link to="/interviews/$id" params={{ id: i.id }} className="flex-1 min-w-0">
        <div className="font-serif text-base leading-tight truncate">{i.founder_name}</div>
        <div className="text-xs text-muted-foreground truncate">{i.business_name} · {i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}</div>
      </Link>
      <StatusBadge status={i.status} />
      <Link to="/interviews/$id" params={{ id: i.id }}>
        <Button size="sm" className="h-7 px-2 gap-1"><Play className="h-3 w-3" /> Start meeting</Button>
      </Link>
    </div>
  );
}

function CalendarEventRow({ ev, memberByEmail }: { ev: any; memberByEmail: Map<string, any> }) {
  const owner = memberByEmail.get(ev.user_email);
  const classes = owner ? (COLOR_CLASSES as any)[owner.color] : DEFAULT_COLOR_CLASSES;
  return (
    <div className={`flex items-center gap-3 px-2 py-3 text-sm border-l-4 ${classes.border}`}>
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
  // "Live" is not surfaced on the meeting-record list any more -- Live-status
  // meetings appear identically to drafts here; the live workspace itself
  // shows recording state.
  if (status === "completed") return <Badge variant="outline">Completed</Badge>;
  return <Badge variant="secondary" className="gap-1"><Play className="h-3 w-3" /> Draft</Badge>;
}


