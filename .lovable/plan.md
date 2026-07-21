## 1. Fix "signature does not persist"

Root cause (verified): `EmailSignatureCard` in `src/routes/admin.accounts.tsx` selects `profiles.select("id, email_signature, full_name")`, but the `profiles` table has no `full_name` column (actual: `id, email, display_name, avatar_url, created_at, updated_at, email_signature`). The select errors, `q.data` is null, and on every reload the editor initialises to empty — the signature is saved but appears lost.

Fix: change the select to `id, email_signature, display_name`. No schema change.

## 2. Events — Add/Edit modal

In `src/routes/events.tsx` edit dialog:
- Add a **Venue** input placed **before** City / Country.
- Add **Start Time** and **End Time** inputs (HTML `time`) in a 2-column row.
- Remove the **Region** field from the form.

Migration: add `events.start_time text` and `events.end_time text` (nullable). Region column stays in DB (used by tab filtering); the form defaults `region` from country ("SA" if country contains "south africa", else "Global") so existing filters keep working.

## 3. Events — hide "Add contact" until booked

In `EventRow` (`src/routes/events.tsx`), render the orange **Add contact** button only when `e.booked` is true.

## 4. "30 new events found" daily toast

Root cause (verified): `src/routes/events.tsx` auto-runs `discoverMut` every time the screen opens and toasts the count. The server function keeps flagging events as "new".

Fix (frontend only): gate the auto-run with a `localStorage` timestamp key `events:last_discover_at` — auto-run at most once per 24h per browser. Keep a manual "Check for new events" link for on-demand runs.

## 5. Contacts — Group By dropdown

In `src/routes/contacts.index.tsx`, replace the single "Events" toggle with a **Group by** `<Select>`:
- **None** (flat list)
- **Event** (existing logic — uses `source_event`)
- **Category** ("Ecosystem" grouping — groups by `contact.category` using existing `CATEGORY_LABELS`)
- **Company** (groups by `contact.company`; "No company" bucket for blanks)

Parameterise the existing group renderer. Persist selection in `localStorage` (`contacts:group_by`).

## 6. Calendar not syncing meetings/events with connected account calendars

Investigate before changing behaviour — the diagnosis is currently unconfirmed. First-turn checks in build mode:
- Read `src/lib/google-calendar-sync.functions.ts`, `src/routes/api/cron.sync-google-calendars.ts`, and `src/lib/google-calendar.ts` to confirm what the sync writes and reads.
- Query `google_oauth_connections` (row exists? `expires_at` in the past? refresh token present?) and `google_calendar_events` (row count, most recent `updated_at`, `user_email` coverage) to determine whether the sync is failing, stale, or running but the UI is filtering results out.
- Check the Calendar page's queries (`src/routes/calendar.tsx`) to confirm it reads `google_calendar_events` for the signed-in team's emails and isn't filtered by an outdated date range or `hidden` flag.

Then apply the fix indicated by those checks. Likely candidates:
- **Token refresh missing/broken** → refresh Google access token in the sync function using the stored `refresh_token` before listing events.
- **Cron not running / stale data** → add a manual "Sync now" button on `/calendar` and `/interviews` that invokes the sync server fn for the current user, plus auto-invoke on screen mount when `last_synced_at` is >15 min old.
- **UI filter mismatch** → widen the calendar query window and drop over-eager holiday/attendee filters that also hide real meetings.

Scope is confined to the sync function and the calendar/meetings read paths; no schema change unless a missing column is discovered.

## 7. DD Admin — Round chip + heading styling

In `src/routes/admin.dd-framework.tsx` (and/or `src/components/RoundStepper.tsx` if the admin reuses it):
- Round-number chip: solid **forest green** background with **white** font (replace the current outlined/muted chip).
- The "Round 1:" heading (round title prefix) rendered **bold** in the **forest green** brand colour.

CSS uses the existing forest-green token (`text-primary` / `bg-primary`) so it stays consistent with the global palette.

## Technical details

- Files edited:
  - `src/routes/admin.accounts.tsx` — fix profiles select.
  - `src/routes/events.tsx` — modal fields, hide Add-contact until booked, throttle auto-discover.
  - `src/routes/contacts.index.tsx` — Group-by dropdown.
  - `src/lib/google-calendar-sync.functions.ts` / `src/routes/calendar.tsx` / `src/routes/interviews.index.tsx` — calendar sync fix (exact edits chosen after the diagnostic reads above).
  - `src/routes/admin.dd-framework.tsx` (+ possibly `src/components/RoundStepper.tsx`) — round chip + heading colour.
- Migration: add `events.start_time text`, `events.end_time text` (nullable).
- No RLS or auth changes.
