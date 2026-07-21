## 1. Fix signature save

In `src/routes/admin.accounts.tsx` (`EmailSignatureCard`), the editor is initialized on first render before the profile query resolves, so saved signatures render as blank on reload and the next save wipes them. Change the init effect to only run once `q.isSuccess` is true, so the stored HTML is written into the contentEditable div after the fetch resolves.

## 2. Remove Chimanimani / Cave Meeting and stop private sub-calendars re-syncing

`syncCalendarForUser` pulls every sub-calendar in the connected Google account's calendarList. Private/shared calendars the info@alicelane account is subscribed to get pulled in even if they're not in the primary view.

- Delete the offending rows now: `DELETE FROM google_calendar_events WHERE title ILIKE '%Chimanimani%' OR title ILIKE '%Cave Meeting%'`.
- Add a durable per-account exclusion mechanism:
  - Migration: add `hidden_calendar_ids text[] NOT NULL DEFAULT '{}'` to `public.google_oauth_connections`.
  - `src/lib/google-calendar-sync.functions.ts`: load `hidden_calendar_ids` for the connection and skip those calendars in the sub-calendar loop. Add `setHiddenCalendars({ targetEmail, hiddenIds })` server fn that updates the array and deletes any already-synced events whose `calendar_id` is now hidden.
  - `src/routes/admin.accounts.tsx`: re-enable the currently-gated `SubCalendarsList` block, add a checkbox per sub-calendar wired to `setHiddenCalendars`, and invalidate `team-google-connections`, `sub-calendars`, `upcoming-calendar-meetings`, `all-meetings` on toggle.

## Out of scope

No changes to auth, RLS, or the OAuth flow itself. No global title-based blocklist — exclusion is per sub-calendar per account, which is the correct level for "this calendar is private".
