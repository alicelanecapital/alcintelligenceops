# Plan

## 1. Fix calendar not showing this week's meetings

Audit the calendar pipeline:

- Confirm `fetchAllTeamCalendarEvents` returns fresh synced events.
- Check the hidden-calendar logic in `google-calendar-sync.functions.ts` is not suppressing real meetings.
- Verify the calendar grid renders qualifying meetings (items with at least one non-Alice-Lane attendee) for the current week.
- If the issue is display-only (e.g. buried under "+N more", wrong month default, or styling), adjust `src/routes/calendar.tsx` accordingly.

The no-attendee filter rule stays as-is per your decision.

## 2. Restructure the Engagements / Meetings list

Replace the single "Planned Meetings" accordion with grouped sections:

- **Today** — expanded by default.
- **This Week** — collapsed by default.
- **Next Week** — collapsed by default.
- **By calendar month/year** — e.g. "August 2026", "September 2026", each collapsed by default.

"Past Meetings" (last 12 months) remains as a single section below.

Style all accordion headers with a green background and white text, as requested.

### Files expected to change
- `src/routes/interviews.index.tsx` — new grouping and accordion styling.
- `src/routes/calendar.tsx` — display/sync verification.
- `src/lib/google-calendar-sync.functions.ts` — hidden-calendar / sync audit.

No database changes and no data deletion.

### Verification
- Preview the Meetings screen to confirm Today/This Week/Next Week/month groups render correctly with green headers.
- Preview the Calendar to confirm this week's qualifying meetings are visible.