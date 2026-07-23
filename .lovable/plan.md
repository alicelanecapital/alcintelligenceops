# Fixes & Restructure

## 1. Events — "Create" doesn't persist
Root cause: `createEvent` in `src/lib/db.ts` only sends `name` and `start_date`, silently dropping venue/city/country/times/website/etc. The row is inserted but has no `region`, so the SA / Global tabs filter it out — the toast says "saved" but the event is nowhere.

- Widen `createEvent` (and add `updateEvent` if needed) to accept the full payload used by the Add Event modal (venue, city, country, start_time, end_time, website, cost, description, who_you_meet, status, region).
- Derive `region` on create from country (SA vs Global) when the user hasn't picked one, so it shows up in the correct tab.
- Show `toast.error` on mutation failure so silent drops can't happen again.

## 2. Duplicated events
Investigate `events` rows to explain what the user sees — likely a mix of AI-discovery re-runs and manual entries with the same `name` + `start_date`. Add a background dedupe on load (same-name + same-date collapse to the earliest row, preferring rows with `booked = true`).

## 3. Calendar
- **"+3 more" not clickable**: turn the overflow chip into a popover listing every item for that day (private meeting / event / task), same styling as the inline chips.
- **Source-of-account dot on meeting labels**: prepend a small colored dot matching the `team_members.color` for the calendar owner (info@, georgia@, ga@firstserve, etc.), reusing the existing legend colors.
- **Remove cached / ghost events**: purge `google_calendar_events` rows whose `user_email` is not in `team_members` (or whose owning calendar has been unsubscribed / hidden), and re-run this cleanup at the end of every sync so unsubscribed sub-calendars and deleted-in-Google items disappear immediately instead of lingering as "ghost" chips on the calendar and Engagements screen.

## 4. Engagements screen (`src/routes/interviews.index.tsx`)
- Rename page heading **Founder Interviews → Meetings**; remove the "Diagnostic Engine" eyebrow.
- Remove the **Events** list section and the **Private Meetings** list section entirely.
- Group meetings into accordions: **Next week**, **Today**, **Last week**, **This month** (each with count badge). Only **Today** expanded by default and highlighted in forest green; others collapsed.
- Move the **Start meeting** control inline on each row (remove the top-right one).
- Restyle **Sync Calendars** button forest green, keep it top-right.
- **Auto-stop recording**: in `src/routes/interviews.$id.tsx` add a `visibilitychange` + `beforeunload` + route-unmount effect that, if a session is live, stops recording and persists the transcript before teardown.

## 5. Live workspace
- Remove the "LIVE" pill/icon from the transcript header (Start/Stop already convey state).

## 6. Contacts
- Remove the **Deduplicate** button. Replace with a passive detector that runs on list load (same normalized name OR same email) and shows a single dismissible banner: "N possible duplicates — Review". Clicking opens the existing merge dialog prefilled.
- Add a **Datasheet view** toggle next to the existing view switch. Datasheet renders contacts as an editable grid (name, category, company, position, email, phone, source event) with inline editing that saves on blur, SharePoint-list style. Reuses `updateContact` from `src/lib/contacts.ts`.

## 7. Nav order
In `src/components/AppShell.tsx`, resequence the top of the CRM section to: **Calendar → Events → Contacts** (rest unchanged).

## Technical notes
- `createEvent`/`updateEvent` widen: keep types loose (`Partial<EventRow>`) and rely on RLS + column defaults. No migration needed — all target columns already exist.
- Datasheet view: plain `<table>` with `<input>`/`<select>` per cell, optimistic update via a single `useMutation` keyed by `{id, field}`. Avoid pulling in a grid library.
- Auto-stop: guard with a ref so it only fires when `isRecording === true`; call the same stop handler already used by the Stop button so memo generation still runs.
- Duplicate detector: pure client-side over the already-fetched contacts list; no new queries.
- Ghost-event cleanup: single SQL delete against `google_calendar_events` filtered by team roster + hidden_calendar_ids, invoked from the sync server fn and once on Calendar mount.

## Out of scope
Any redesign of the DD Engine, Synopsis, or Admin screens. No schema/migration changes.
