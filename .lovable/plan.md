## Fixes and refinements

### 1. Profile photo upload fails ("new row violates row-level security policy")

The `contact-photos` storage policies still use `auth.jwt() ->> 'email' like '%@alicelanecapital.com'`. Sessions whose JWT email doesn't match (e.g. `ga@firstserve.co.za`) are rejected.

- Migration: drop email-pattern policies on `storage.objects` for `bucket_id = 'contact-photos'` and replace with `private.is_team_member(auth.uid())` for INSERT/UPDATE/DELETE (matches the pattern used everywhere else after the earlier security fix). Add matching SELECT policy for consistency.

### 2. Contact detail — Overview tab layout

In `src/routes/contacts.$id.tsx` `OverviewTab`:
- Move **Sector** out of the left accordion into the right-hand sidebar, directly under **Source event**.
- Move **Opportunities in workflow** into the right sidebar, under Sector.
- Left column keeps: Company **D**escription (capital D, expanded by default), DISC (expanded), Red Flags (expanded).
- Set `Accordion type="multiple" defaultValue={["company","disc","flags"]}`.

### 3. Live Workspace tab should only show the Live Workspace

Refactor `src/components/DDInterviewEnhanced.tsx` recorder/transcript panels into an exported `LiveWorkspacePanel`, and render it inline in the Contact's Live Workspace tab scoped to the contact's live/latest meeting (replacing the current link-out placeholder).

### 4. Upload transcripts in Live Workspace

Add an "Upload transcript" button in the Live Workspace panel using existing `src/lib/extract-transcript-text.ts`. Parsed text is inserted as utterances on the current meeting (`interview_utterances`) so downstream AI analysis matches live recording.

### 5. Auto-generate IC report on session end

When "Stop" marks a meeting `completed` (in `interviews.$id.tsx` and the workspace header), trigger the existing report generation server fn and save the output into `dd_interview_documents` with `document_category = 'ic_report'`, `round = 1`. Round 1 accordion label in Contact → Documents becomes "Round 1 — Discovery Meeting".

### 6. Rename "DIAGNOSTIC ENGINE" eyebrow

In `src/routes/interviews.index.tsx` and `src/routes/interviews.$id.tsx`, change the eyebrow from `"Diagnostic Engine"` to `"Engagements"` (page title stays contextual).

### 7. "Add contact" from Events list on Engagements screen

Add an "Add contact" button on each booked-event row in `interviews.index.tsx` that opens the contact-add flow with `source_event_id` prefilled.

### 8. "View Synopsis" → Contact AI Overview

In `src/routes/dd-engine.tsx`, `handleViewSynopsis` navigates to `/contacts/$id?tab=overview` for the opportunity's linked contact. `contacts.$id.tsx` reads the `tab` search param and defaults `Tabs` to it.

### 9. Calendar — clean up duplicate "Unavailable" entries & fix legend

Symptom: Multiple duplicated "Unavailable" pills on the calendar, `info@alicelanecapital.com` still appears in the legend after being removed from Accounts, while `ga@firstserve.co.za` and `georgia@alicelanecapital.co.za` don't show.

- **Deduplicate calendar events** in `src/routes/calendar.tsx` (and `interviews.index.tsx` where it also renders calendar events): key by `(user_email, start_time, end_time, normalized_title)` — where `normalized_title` collapses masked "Unavailable" items — so a meeting synced under multiple sub-calendars renders once. Prefer the entry belonging to a currently-active team member.
- **Data cleanup**: hard-delete rows from `google_calendar_events` whose `user_email` no longer maps to an active row in `team_members` (removes stale `info@alicelanecapital.com` events left behind after the team member was removed).
- **Legend source of truth**: build the calendar legend strictly from `team_members` currently in the DB (not from `distinct user_email` in `google_calendar_events`), so removing a team member removes them from the legend immediately, and add the missing `ga@firstserve.co.za` / `georgia@alicelanecapital.co.za` rows to `team_members` (with distinct colors) if absent so their events surface with a legend chip.
- **Sync scope**: in `src/lib/google-calendar-sync.functions.ts`, skip fetching for any `google_oauth_connections` row whose email is not in `team_members`, so a re-sync doesn't re-import the removed account.

---

### Technical notes

- Files touched: new migration for `contact-photos` storage policies + `team_members` cleanup; `src/routes/contacts.$id.tsx`; `src/components/DDInterviewEnhanced.tsx` and/or `src/routes/interviews.$id.tsx`; `src/routes/interviews.index.tsx`; `src/routes/dd-engine.tsx`; `src/routes/calendar.tsx`; `src/lib/google-calendar-sync.functions.ts`.
- Data ops (row deletes for stale calendar events, team_members inserts) go through the insert tool, not migrations.
