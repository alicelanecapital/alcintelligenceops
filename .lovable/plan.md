## What to change

### 1. Restore David Davies meeting row

There is currently no `interviews` row for David Davies (Izenzo) — the earlier row has been removed from the database, which is why the Live Workspace can no longer be opened. Every other interview row is also flagged `hidden = true`, so nothing appears in Engagements.

Insert a fresh interview linked to David's contact so the Live Workspace becomes reachable again:

- `contact_id = 645da1a6-72b4-4b58-9afe-9a3dd3065522`
- `founder_name = "David Davies"`, `business_name = "Izenzo"`
- `status = "completed"` (so it shows in Past Meetings and opens the read-only Live Workspace)
- `started_at` / `ended_at` = the original 23 Jul 2026 13:09 slot
- `hidden = false`

### 2. Rework Engagements screen into Planned Meetings / Past Meetings

`src/routes/interviews.index.tsx` currently buckets everything by "Today / Next week / <Month YYYY>", so no explicit "Planned Meetings" heading is ever shown. Replace that grouping with two fixed accordion sections:

```text
▼ Planned Meetings   (upcoming — from today onward)
▼ Past Meetings      (previous 12 months only, most recent first)
```

Rules:
- Each item (interview row or Google calendar row) goes into Planned if `when >= startOfToday`, otherwise into Past.
- Past Meetings is capped to the last 12 months (`when >= subYears(now, 1)`); anything older is dropped from view.
- Planned sorted ascending; Past sorted descending.
- Planned Meetings accordion is expanded by default; Past collapsed.
- Existing external-attendee / holiday / hidden-bracket filters and the calendar-vs-interview row components stay unchanged.

### 3. No other UI or logic changes

Row rendering, status badges, sync button, and dedupe behaviour all stay as they are.

## Technical notes

- Insert uses the `insert` tool (data change), not a migration.
- Grouping change is local to `interviews.index.tsx`; `listInterviews` and `fetchUpcomingGoogleCalendarEvents` are unchanged.
- `subYears` from `date-fns` is already available; add it to the existing import.
