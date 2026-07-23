## Changes

### 1. Replace "Busy" label with owner initials + no-entry icon

In `src/routes/calendar.tsx`:
- Remove `maskUnavailable()` returning `"Busy"`. Instead, treat matches as a flag: `isBusy(title)`.
- Extend `CalItem` with `busy?: boolean` and `endDate?: Date`.
- Busy chips render: small `Ban` icon (lucide-react, 10px) + owner initials (e.g. `GA`, `TS`) derived from the teammate's email local-part, with per-email overrides in a `BUSY_INITIALS` map.
- Show `HH:mm–HH:mm` using `start_time` and `end_time`; fall back to `HH:mm` when only start is a datetime.
- `src/lib/google-calendar.ts`: include `end_time`, `google_event_id`, `calendar_id` in `fetchAllTeamCalendarEvents`.

### 2. CRUD panel below the calendar with bidirectional Google sync

Selected-day card becomes editable:
- Header gets a "+ New event" button opening a dialog with Title, Start (date+time), End (date+time), Location, Description, Calendar (dropdown from `listGoogleSubCalendars` for the signed-in user).
- Each row (for events the signed-in user owns) gets Edit and Delete buttons. App-entity rows (meetings/events/tasks) remain read-only.

Server functions (`src/lib/google-calendar-crud.functions.ts`, new), all `requireSupabaseAuth` and using `getValidGoogleAccessToken(context.claims.email)`:
- `createGoogleCalendarEvent` — POST to `.../calendars/{calId}/events`, mirror into `google_calendar_events`.
- `updateGoogleCalendarEvent` — PATCH `.../events/{googleEventId}`, mirror.
- `deleteGoogleCalendarEvent` — DELETE `.../events/{googleEventId}`, delete local row.
- Refuse when target row's `user_email` ≠ caller email.

Bidirectionality: writes go to Google first then mirrored; the existing 15-min cron pulls in third-party changes. Each mutation invalidates `["team-calendar-events"]`.

### 3. Event status: Done · Cancelled · Postponed

Migration — add a nullable `status` column to mirror per-event lifecycle without breaking existing rows:

```sql
ALTER TABLE public.google_calendar_events
  ADD COLUMN IF NOT EXISTS status text
  CHECK (status IN ('done','cancelled','postponed'));
```

No GRANT changes needed (existing grants cover the new column). Also add the same column to `public.interviews` and `public.events` so app-native meetings and events can carry a status too.

Selected-day panel:
- Each row gets a `Select` (Open · Done · Cancelled · Postponed) that writes through a small `setStatus` server fn per source table (`google_calendar_events` for owner-matching Google rows via a new `setGoogleEventStatus` fn; direct Supabase update for `interviews` / `events` / `tasks`).
- On change, invalidate the matching queries.

Calendar grid + panel rendering:
- `status = 'cancelled'` → `line-through` and reduced opacity on the chip label; the small icon (Ban / clock / dot) becomes grey.
- `status = 'done'` → `opacity-40 text-muted-foreground` (visibly greyed out but still legible).
- `status = 'postponed'` → append " · Postponed" to the tooltip and italicise; keeps its normal colour so it's still visible for rescheduling.
- Task rows use the same rules (`tasks.status = 'Done'` already exists — reuse it for the greyed-out treatment).

Legend gets three tiny swatches: strikethrough, greyed, italic.

### 4. Type/data plumbing

- `CalItem` extended with `status?: 'done'|'cancelled'|'postponed'`.
- `itemStyle(it)` composes existing colour classes with the new status classes.
- No schema changes to `tasks` (already has textual status).

## Not in scope

- Editing Google events owned by another teammate from the current session (Google rejects without delegated access) — those rows render without Edit/Delete/Status controls.
- Recurring-event editing (single-occurrence writes only; dialog notes this).