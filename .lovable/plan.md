## What I found (verified against the live data)

You're right — those events do have guests in Google. The reason they look attendee-less in the app is two separate defects:

**1. The `georgia@alicelanecapital.com` account syncs zero events.**
The connection exists and `last_synced_at` updated today, but `google_calendar_events` contains **no rows at all** for that user. Every row in the table belongs to `ga@firstserve.co.za` (108 rows on its primary calendar, 8 on `info@alicelanecapital.com`). So the original invites — the ones that actually carry Georgia Adams as organizer plus `thabiso@alexbiz.org.za` and Tendai Shamu — were never stored.

**2. The copies that did sync have their guest lists stripped.**
The two events in your screenshots exist only as mirrored copies on the firstserve calendar, titled `... (alicelanecapital)`. Those copies come across from Google with an empty `attendees` array — which is why the "must have a non-Alice-Lane attendee" rule hides them.

## Fix

### A. Make the Alice Lane account actually sync
- Stop the sync loop from silently swallowing failures: currently any calendar that errors is skipped with a bare `continue`, and a missing/expired token returns `not_connected` quietly while still stamping `last_synced_at`.
- Collect per-calendar outcomes (calendar name, events fetched, HTTP status on failure) and return them from the sync function so the "Sync calendars" button reports exactly which calendar failed and why.
- Only stamp `last_synced_at` when at least one calendar succeeded.
- Run a sync for `georgia@alicelanecapital.com` and read the per-calendar report to confirm the root cause (expired refresh token vs. calendars filtered out by `selected !== false` vs. API error), then fix that specific cause.

### B. Stop losing real meetings to the attendee filter
Keep your rule that attendee-less personal blocks aren't meetings, but recognise that a stripped mirror copy is not attendee-less in reality:
- Treat an item as a meeting when it has at least one external attendee **or** it carries a conferencing link (Google Meet / phone bridge) — the screenshots show both events have Meet links, which only real invited meetings have.
- Still exclude holidays, hidden bracketed personal calendars, and all-day blocks.
- Cross-account de-duplication: when the original and the `(alicelanecapital)` mirror both land in the table, collapse them to one row, preferring the copy that has attendees.

Applies to both the Calendar grid (`src/routes/calendar.tsx`) and the Meetings list (`src/routes/interviews.index.tsx`) so the two screens stay consistent.

### Files expected to change
- `src/lib/google-calendar-sync.functions.ts` — per-calendar error reporting, honest `last_synced_at`, root-cause fix.
- `src/components/SyncGoogleButton.tsx` — surface the per-calendar sync report.
- `src/routes/interviews.index.tsx` and `src/routes/calendar.tsx` — meeting-detection rule and cross-account de-duplication.

No schema changes, no data deletion.

### Verification
- Re-sync and confirm rows appear for `georgia@alicelanecapital.com`.
- Confirm "Alice Lane and Adaptive Leadership in Action Synergies" (Tue 28 Jul, 13:00) and "AlexBiz Meeting Placeholder" (Thu 30 Jul, 12:00) both show once — not twice — on the Calendar and under Meetings → This Week.
