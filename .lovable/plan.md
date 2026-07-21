Three independent fixes.

## 1. Sync error: "ON CONFLICT DO UPDATE cannot affect row a second time"

Root cause (confirmed in `src/lib/google-calendar-sync.functions.ts`): every sub-calendar's events are pushed into one array, then `upsert(rows, { onConflict: "user_email,google_event_id" })`. When the same Google event appears on more than one of `ga@firstserve`'s calendars (e.g. an event on `primary` that they're also an attendee of on a shared calendar), the batch holds two rows with the same `(user_email, google_event_id)` — Postgres refuses to update the same row twice in one statement.

Fix: dedupe by `(user_email, google_event_id)` with a `Map` before the upsert, preferring the primary-calendar entry on collision. No schema change.

## 2. Signature not persisting after refresh

Confirmed in DB: `georgia@alicelanecapital.com` has a 2049-char signature saved; `tendai@alicelanecapital.com` has `email_signature = NULL` despite the "Saved" toast — the client-side upsert path is silently no-op'ing for at least one account (likely a race with `auth.getSession()` on first load so `user.id` doesn't match the JWT sub yet, or RLS returning 0 affected rows without an error).

Fix: move the write server-side so we can guarantee identity + verify the row after write.

- New `src/lib/profile.functions.ts` → `updateMyEmailSignature` (`createServerFn` + `requireSupabaseAuth`) that upserts `{ id: context.userId, email_signature }` via `context.supabase`, then re-reads and throws if the persisted length doesn't match — silent RLS failure surfaces as a real error toast.
- `EmailSignatureCard` in `src/routes/admin.accounts.tsx` calls that server fn instead of `supabase.from("profiles").upsert(...)`.
- Scope the fetch query key to the user (`["my-profile", user.id]`) so a stale cache can't mask the real DB value on refresh.

## 3. Synced calendars don't appear on the unified Calendar

Confirmed in `src/routes/calendar.tsx`: the unified calendar reads `events`, `meetings`, `interviews`, `tasks`, and reads `google_calendar_events` only to identify public holidays (line 108). Actual Google events are never rendered as calendar items — that's why the Meetings screen shows them but the Calendar looks empty for the newly synced accounts.

Fix (frontend only, in `calendar.tsx`):
- Add a `useQuery(["team-calendar-events"], fetchAllTeamCalendarEvents)` that pulls all synced Google events across every teammate (already exported from `src/lib/google-calendar.ts`).
- Filter out rows that match the existing holiday heuristic (so we don't double-render — holidays stay as pastel day backgrounds).
- Push each remaining row into `items` with `type: "meeting"`, `date: start_time`, `label: title`, `sub: user_email`, and an extra `owner: user_email` field.
- Colour-code by team member: reuse `TEAM_MEMBER_COLORS` + `COLOR_CLASSES` from `src/lib/team-members` / `src/lib/team-member-colors`, keyed by joining `google_calendar_events.user_email` to `team_members.email` (via a small `useQuery(["team-members"], fetchTeamMembers)`) and falling back to a stable hash-based colour when the email isn't on the roster.
- Update `itemStyle(it)` so meetings with an `owner` render in that member's colour, keeping events green and tasks orange as they are today.
- Add a small legend row above the grid mapping each connected team member's email to their swatch (alongside the existing contact-type legend), so the different colours are self-explanatory.

No backend/schema changes; the sync already stores per-`user_email` rows.

## Files touched

- `src/lib/google-calendar-sync.functions.ts` — dedupe before upsert.
- `src/lib/profile.functions.ts` — new, one server fn.
- `src/routes/admin.accounts.tsx` — swap client upsert for the server fn; per-user query key.
- `src/routes/calendar.tsx` — render synced Google events as colour-coded meetings + team legend.

No migrations, no other UI changes.
