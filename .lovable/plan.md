## 1. Adhoc status (new)

Adds an `adhoc` value across the three tables that carry a status column and defaults manually-created rows to it.

**Migration** — extend the status check constraint / enum on `google_calendar_events`, `interviews`, and `events` to allow `'adhoc'`.

**Server functions** (`src/lib/google-calendar-crud.functions.ts`)
- `createGoogleCalendarEvent`: when mirroring the created event into `google_calendar_events`, set `status: 'adhoc'`.
- Widen the `Status` type on `setGoogleEventStatus` / `setInterviewStatus` / `setEventStatus` to include `'adhoc'`.

**Manual meeting creation**
- `src/lib/interviews.functions.ts` `createInterview`: default `status: 'adhoc'`.
- `public.events` "Add event" insert: default `status: 'adhoc'`.

**UI** — `src/routes/calendar.tsx`
- `Status` type: add `"adhoc"`.
- No visual dimming for adhoc; it's a label, not a state like Done/Cancelled.
- Day-panel Select: options become Open, Adhoc, Done, Cancelled.
- Existing rows keep their current status; only new ones become Adhoc.

## 2. Accounts screen cleanup (`src/routes/admin.accounts.tsx`)

The current layout has the Sync buttons and the swatch selections misaligned across rows, and the sub-calendar list is uncomfortably small.

- **Align rows into a consistent grid**: each account row uses the same fixed columns — avatar, name/email block, color swatches, Sync button, Disconnect button — so buttons line up vertically down the list regardless of email length.
- **Color swatches**: uniform circle size, fixed gap, consistent selected-state ring; the whole swatch group sits in a fixed-width slot so it never squeezes the Sync button off-line.
- **Sync button alignment**: put Sync + Disconnect in a right-aligned action cluster with a fixed min-width so they never shift by row.
- **Sub-calendar list font**: bump from ~11px to 12–13px, tighten vertical rhythm, and add a subtle divider between calendars for legibility.
- **Hidden badge color**: change from the current bright red to a crimson (`text-crimson` / `bg-crimson-50` using a `--color-crimson` token added to `src/styles.css`, oklch equivalent of `#DC143C`).

No changes to the accounts data model, sync logic, or which calendars are hidden — this is purely presentation.

## Files touched
- Migration (status constraint)
- `src/routes/calendar.tsx`
- `src/lib/google-calendar-crud.functions.ts`
- `src/lib/interviews.functions.ts`
- Events "Add event" insert path
- `src/routes/admin.accounts.tsx`
- `src/styles.css` (crimson token)
