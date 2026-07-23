
## 1. New Event save
Root cause: the Events list filters to `end_date/start_date >= today`, and new events don't get `is_new=true`, so a freshly created event with today's or past dates disappears from view even though it saved.
- In `src/routes/events.tsx`, when opening "Add event", seed `editingEvent` with `{ is_new: true, status: "Medium" }`.
- Change the Upcoming list filter to include events with no dates OR dates >= today.
- Show a validation toast if `name` is empty on save.

## 2. "Personal Contacts" event grouping
- Data change: null out `contacts.source_event_id` for any contact whose linked event is named "Personal Contacts" (targets Botha and any others), then delete the "Personal Contacts" event row. The contacts fall into the existing "No event" bucket automatically.

## 3. Event picker deduplication
Event dropdowns currently list duplicates from Google-imported/discovered rows.
- In the shared `EventSelect` component, dedupe options by normalized name + start_date, keeping the earliest-created row. Sort alphabetically.

## 4. Calendar duplicate cleanup — same account, same event
Google-synced rows sometimes duplicate within a single account (event appearing in both the primary and a sub-calendar the user also owns).
- SQL cleanup: for each `(user_email, google_event_id)` and, when `google_event_id` is null, `(user_email, title, start_time)`, keep the earliest `created_at` row and delete the rest from `google_calendar_events`.
- Update the sync upsert path in `src/lib/google-calendar-sync.functions.ts` to prevent re-introducing the duplicates (dedupe in memory before upsert using the same key).
- Apply the same dedupe key to the Meetings screen and the Calendar screen render passes so any surviving duplicates still collapse in the UI.

## 5. Rename "Unavailable" → "Busy"
- Global rename across the app for the bracketed-private masking label used on the Calendar and Meetings screens (`(smartify)`, `(nonastasia)`, `(georgiaadams)` titles show as "Busy" instead of "Unavailable").
- Update the constant, all render sites, tooltip text, and legend.

## 6. Company description hallucinations
- Tighten the AI description prompt: require empty string when sources are thin, forbid invented awards/valuations/investors, lower temperature.
- On the Contact Overview, if `company_description` is empty show a "Generate description" affordance instead of auto-filling speculative text.

## 7. Relationship History (AI Overview)
- New "Relationship History" panel above "DISC Personality Profile" on the Contact AI Overview tab.
- New server function `getRelationshipTimeline({ contactId })` reads `communications` rows for the contact, sends them to Lovable AI, returns `{ bullets: [{ date, summary, source }] }`.
- Render as a vertical timeline (date · bullet) with a subtle left rail. Empty state: "No email intelligence yet."

## 8. Upload transcript in Live Workspace
- Add an "Upload transcript" button in the Live Transcript frame.
- Accepts `.txt`, `.vtt`, `.srt`, `.docx` (reuse `extract-transcript-text`).
- Parses to utterances (split on blank lines or speaker labels; otherwise single utterance) and inserts via `insertUtterance`.
- After upload, marks interview `completed` and auto-runs `finalizeInterview`.

## 9. New Founder Meeting dialog
- In `src/components/NewMeetingDialog.tsx` remove the "Existing founder (optional)" select block; keep only Founder name / Business / Industry. Remove the unused `founders` query and `founderId` state.

## 10. Live Workspace auto-finalize + control placement
- Remove the "End interview & generate memo" button from Manual Assessment.
- Trigger `finalizeInterview` automatically when Stop is clicked or a transcript upload completes.
- Move Start/Stop out of the header strip into the Live Transcript card header (right side, next to the Speaker toggle).
- Show Start only when `recording === false`, Stop only when `recording === true`, so the button no longer sticks on "Stop" after finalization. On finalize, set `recording=false` and swap in a "Regenerate memo" secondary link.

## Technical notes
- Files touched: `src/routes/events.tsx`, `src/components/EventSelect.tsx`, `src/routes/contacts.$id.tsx`, `src/routes/interviews.$id.tsx`, `src/routes/interviews.index.tsx`, `src/routes/calendar.tsx`, `src/components/NewMeetingDialog.tsx`, `src/lib/contact-brief.functions.ts`, `src/lib/google-calendar-sync.functions.ts`, plus new `src/lib/relationship-history.functions.ts`.
- One SQL migration + data cleanup: "Personal Contacts" event, and `google_calendar_events` intra-account duplicates.
- No schema additions required for Relationship History (uses existing `communications`).
