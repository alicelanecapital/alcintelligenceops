## Goal
Show organiser + attendees inline on Google calendar rows in the Day Detail panel (8px, no extra line). Treat three specific personal emails as Busy on the calendar grid, and hide their organiser/attendee info in the day panel.

## Changes

### 1. `src/lib/google-calendar.ts`
Add `organizer_email` to the select in `fetchAllTeamCalendarEvents` and to the return type.

### 2. `src/routes/calendar.tsx`

**a. Extend `CalItem`** with `organizerEmail?: string` and `attendees?: {email?: string; name?: string|null}[]`, and populate them from the Google row.

**b. Busy detection by email.** Add a constant:
```
const BUSY_EMAILS = new Set([
  "georgia.adams@smartify.co.za",
  "info@georgiaadams.co.za",
  "nonastasia@gmail.com",
]);
```
When building the Google item, mark `busy = true` if the existing bracket-token check matches OR if the organizer_email OR any attendee email is in `BUSY_EMAILS`. For those rows the calendar chip already renders "GA" + red no-entry icon via existing `busy` path — no grid change needed beyond making `initialsFromEmail` return "GA" for these emails (extend `BUSY_INITIALS` map).

**c. Day Detail row (lines ~426-466).** Inside the existing `<div className="flex-1 min-w-0">` block, append a single inline `<span className="text-[8px] text-muted-foreground ml-2">` on the same line as the title (no new `<div>`), showing `Org: <organizer> · With: <a1>, <a2>, +N` — truncated to 2 names + overflow count. Suppress this span entirely when `it.busy` is true (per spec: show nothing for those emails). Only render for `sourceTable === "google_calendar_events"`.

## Notes
- Attendees are already selected in the query; only `organizer_email` is missing from the select.
- No DB migration required.
- No changes to the meetings/engagements screen.
