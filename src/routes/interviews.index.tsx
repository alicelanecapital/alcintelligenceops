import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { listInterviews, listGraduatedMeetingOpportunities } from "@/lib/interviews";
import { fetchUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import { isMeetingRow, dedupeAcrossAccounts } from "@/lib/meeting-filters";
import { fetchTeamMembers } from "@/lib/team-members";
import { COLOR_CLASSES, DEFAULT_COLOR_CLASSES } from "@/lib/team-member-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AddMeetingDialog } from "@/components/AddMeetingDialog";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus, CalendarClock, MapPin, Video, Search } from "lucide-react";

import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, subYears,
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
  const candidates = events.filter((ev) => {
    if (isHoliday(ev)) return false;
    if (isHiddenBracketed(ev.title)) return false;
    // Meetings must have a non-alicelanecapital attendee or a conferencing link.
    // Mirrored copies of an invite land on a second account with the guest list
    // stripped, so attendees alone would wrongly hide real meetings.
    return isMeetingRow(ev);
  });
  // Collapse the same meeting synced from several teammates' accounts (and its
  // stripped mirror copies) into one row, keeping the richest copy.
  return dedupeAcrossAccounts(candidates);
}


type Item = { kind: "interview" | "calendar"; when: Date; data: any };
type Group = { key: string; label: string; items: Item[] };

/** Buckets planned meetings into Today / This Week / Next Week / then one group
 *  per calendar month ("August 2026", "September 2026", …). */
function groupPlanned(items: Item[]): Group[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  // Weeks run Monday-Sunday.
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

  const today: Item[] = [];
  const thisWeek: Item[] = [];
  const nextWeek: Item[] = [];
  const byMonth = new Map<string, Item[]>();

  for (const it of items) {
    const t = it.when.getTime();
    if (t >= todayStart.getTime() && t <= todayEnd.getTime()) today.push(it);
    else if (t > todayEnd.getTime() && t <= thisWeekEnd.getTime()) thisWeek.push(it);
    else if (t >= nextWeekStart.getTime() && t <= nextWeekEnd.getTime()) nextWeek.push(it);
    else {
      const key = format(it.when, "yyyy-MM");
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(it);
    }
  }

  const groups: Group[] = [
    { key: "today", label: "Today", items: today },
    { key: "this-week", label: "This Week", items: thisWeek },
    { key: "next-week", label: "Next Week", items: nextWeek },
  ];
  for (const key of Array.from(byMonth.keys()).sort()) {
    const bucket = byMonth.get(key)!;
    groups.push({ key, label: format(bucket[0].when, "MMMM yyyy"), items: bucket });
  }
  return groups;
}


function InterviewsIndex() {
  const q = useQuery({ queryKey: ["interviews"], queryFn: listInterviews });
  const upcoming = useQuery({ queryKey: ["upcoming-calendar-meetings"], queryFn: fetchUpcomingGoogleCalendarEvents });
  const members = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });
  const graduated = useQuery({ queryKey: ["graduated-meetings"], queryFn: listGraduatedMeetingOpportunities });
  const memberByEmail = new Map((members.data ?? []).map((m) => [m.email, m]));
  const graduatedMap = graduated.data ?? new Map<string, string>();
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  const { plannedGroups, past } = useMemo(() => {
    const items: Item[] = [];
    for (const i of q.data ?? []) items.push({ kind: "interview", when: new Date(i.created_at), data: i });
    for (const ev of dedupeEvents(upcoming.data ?? [])) items.push({ kind: "calendar", when: new Date(ev.start_time), data: ev });
    const todayStart = startOfDay(new Date()).getTime();
    const oneYearAgo = subYears(new Date(), 1).getTime();
    const planned: Item[] = [];
    const past: Item[] = [];
    for (const it of items) {
      if (term && !matchesSearch(it, term)) continue;
      // Graduated meetings (moved to the Deal Pipeline) never sit in the Planned queue --
      // they're done as an Engagement, only their history remains.
      if (it.kind === "interview" && graduatedMap.has(it.data.id)) { past.push(it); continue; }
      const t = it.when.getTime();
      if (t >= todayStart) planned.push(it);
      else if (t >= oneYearAgo) past.push(it);
    }
    planned.sort((a, b) => a.when.getTime() - b.when.getTime());
    past.sort((a, b) => b.when.getTime() - a.when.getTime());
    return { plannedGroups: groupPlanned(planned), past };
  }, [q.data, upcoming.data, graduatedMap, term]);

  // While searching, hide empty groups and open the ones that matched so results aren't
  // buried inside a collapsed accordion.
  const visibleGroups = term ? plannedGroups.filter((g) => g.items.length > 0) : plannedGroups;
  const openPlanned = term ? visibleGroups.map((g) => g.key) : ["today"];


  const renderRows = (items: Item[]) =>
    items.length === 0 ? (
      <div className="text-sm text-muted-foreground italic px-2 py-4">Nothing scheduled.</div>
    ) : (
      <div className="divide-y divide-border/40">
        {items.map((it) =>
          it.kind === "interview"
            ? <InterviewRow key={`i-${it.data.id}`} i={it.data} opportunityId={graduatedMap.get(it.data.id) ?? null} />
            : <CalendarEventRow key={`c-${it.data.id}`} ev={it.data} memberByEmail={memberByEmail} />
        )}
      </div>
    );

  const triggerClass =
    "hover:no-underline px-3 py-2.5 rounded-md bg-green-800 text-white font-semibold [&>svg]:text-white hover:bg-green-900";

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Discovery</div>
      <PageHeader
        title="Meetings"
        description="Founder engagements recorded, transcribed and analysed in real time. Every conversation builds Alice Lane's institutional knowledge."
        actions={
          <div className="flex items-center gap-2">
            <SyncGoogleButton mode="team" className="bg-green-700 hover:bg-green-800 text-white border-green-700 hover:border-green-800" />
            <Button onClick={() => setAddMeetingOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Meeting</Button>
          </div>
        }
      />
      <AddMeetingDialog open={addMeetingOpen} onOpenChange={setAddMeetingOpen} />

      <h2 className="text-sm uppercase tracking-[0.15em] text-green-800 font-semibold mt-8 mb-3">Planned Meetings</h2>
      <Accordion type="multiple" defaultValue={["today"]} className="space-y-2">
        {plannedGroups.map((g) => (
          <AccordionItem key={g.key} value={g.key} className="border-none">
            <AccordionTrigger className={triggerClass}>
              <span>
                {g.label}
                <span className="text-white/70 text-xs ml-2 font-normal">({g.items.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-1">{renderRows(g.items)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <h2 className="text-sm uppercase tracking-[0.15em] text-green-800 font-semibold mt-10 mb-3">Past Meetings</h2>
      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="past" className="border-none">
          <AccordionTrigger className={triggerClass}>
            <span>
              Last 12 months
              <span className="text-white/70 text-xs ml-2 font-normal">({past.length})</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1">{renderRows(past)}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Status chips (Live / Paused / Stopped / Draft) are deliberately not shown -- status still
// drives behaviour (resume, planned vs past grouping) but isn't surfaced as a badge.

function InterviewRow({ i, opportunityId }: { i: any; opportunityId: string | null }) {
  const target = opportunityId
    ? { to: "/dd-interview/$opportunityId/$round" as const, params: { opportunityId, round: "1" } }
    : { to: "/interviews/$id" as const, params: { id: i.id } };

  return (
    <Link to={target.to} params={target.params as any} className="flex items-center gap-3 px-2 py-3 hover:bg-muted/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="font-serif text-base leading-tight truncate">{i.founder_name}</div>
        <div className="text-xs text-muted-foreground truncate">{i.business_name} · {i.industry ?? "—"} · {new Date(i.created_at).toLocaleDateString()}</div>
      </div>

      {opportunityId && <Badge className="bg-primary text-primary-foreground">Deal Pipeline</Badge>}
    </Link>
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

