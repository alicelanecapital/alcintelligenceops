## Overview

Four small changes across Contacts, Meetings, and the IC Report:

1. Add a **calendar (Schedule to Meet)** icon on every contact row (list and card view).
2. Change the **"Meet" button on the Contact detail** page so it opens the same **"New founder meeting"** modal used on the Meetings screen (image-17), pre-filled with the contact.
3. Add a **Stop** button to end **live** meetings — both on the Meetings list row and on the interview workspace header.
4. Add an **"Add to Deal Pipeline"** button to the top-right of the IC Report ("Request More Evidence") screen.

## 1. Contact row — Schedule to Meet icon

Files: `src/routes/contacts.index.tsx`

- In `ContactCard` and `ContactListRow`, add a small ghost `CalendarPlus` icon button next to the existing Edit/Delete icons.
- Clicking it opens a lightweight "Schedule to meet" dialog with:
  - Date + time inputs (defaults to next weekday, 10:00)
  - Optional note
  - Save → writes a `scheduled_meetings` entry (or reuses the existing `interviews` row created as a "scheduled" status) so it shows up in the existing `NextMeetingBadge` and the Calendar.
- Reuses the contact's email so the meeting appears in `NextMeetingBadge`.

If a simpler behaviour is preferred, this button can instead open the same "New founder meeting" modal used in change #2. Confirm preference during build; default is the scheduling dialog above so the row-level action is truly a scheduling shortcut (distinct from the "start now" flow on the detail page).

## 2. Contact detail — "Meet" opens the New Founder Meeting modal

Files: `src/routes/contacts.$id.tsx`, small refactor of `src/routes/interviews.index.tsx`

- Extract the existing `NewInterview` dialog from `interviews.index.tsx` into a shared component `src/components/NewMeetingDialog.tsx` (same fields: existing founder, founder name, business, industry, "Generating brief…" state) and accept an optional `defaultValues` prop.
- On the Contact detail page, replace the current `meetMut.mutate()` behaviour with opening `NewMeetingDialog`, pre-filled from the contact:
  - Founder name = contact name
  - Business = company
  - Industry = existing industry/category label
- On submit, the shared dialog calls `startInterview` (as it does today) and navigates to `/interviews/$id` — identical to the Meetings-screen flow.
- The existing `startMeetingForContact` server fn stays for programmatic use elsewhere but is no longer wired to the "Meet" button.

## 3. Stop button for live meetings

Files: `src/routes/interviews.index.tsx`, `src/routes/interviews.$id.tsx`, `src/lib/interviews.ts`

- Add a `stopInterview(id)` helper in `src/lib/interviews.ts` that calls `setInterviewStatus(id, { status: "completed", ended_at: new Date().toISOString() })`. (`setInterviewStatus` already exists.)
- **Meetings list**: in `InterviewColumn` (card and list variants), when `status === "live"` render a red `Stop` button instead of `Start`. Clicking it calls the helper, then invalidates the `["interviews"]` query.
- **Interview workspace header**: when `iv.status === "live"`, show a `Stop meeting` button next to the status badge that calls the same helper and switches the tab to `report` after finalize (reuses the existing `endInterview` if the user is on the Live tab, otherwise a lighter "stop without finalize" that just marks completed — final behaviour confirmed below).

Behaviour choice for the header Stop:
- Default: call `finalizeInterview` (existing) so the report is generated on Stop, matching what the workspace does today when recording ends.

## 4. IC Report — "Add to Deal Pipeline" button

Files: `src/routes/interviews.$id.tsx`, reuse `createOpportunityFromContact` in `src/lib/contacts.functions.ts` (or a small new `createOpportunityFromInterview` server fn).

- In `ReportView`, add a header row above the `Recommendation` card:
  - Left: small "Investment memo" eyebrow.
  - Right: primary button **"Add to Deal Pipeline"** (forest green).
- On click:
  - If the interview has a `contact_id`, call the existing `createOpportunityFromContact` (already deduplicates — it returns the existing opportunity if one already exists for the contact).
  - If not, insert an `opportunities` row using the interview's founder/business info directly.
  - On success: toast "Added to Deal Pipeline" and navigate to `/dd-engine` (or open the opportunity in the DD interview at round 1, matching the current pattern from the contact page).

## Verification steps after build

- Click the calendar icon on a contact row → schedule dialog opens; saved meeting appears in `NextMeetingBadge`.
- Contact detail "Meet" → New Founder Meeting modal opens pre-filled; submitting takes you to the interview workspace with a generated brief.
- A meeting whose status is `live` shows Stop (not Start) on the Meetings list; Stop marks it completed and it disappears from the live list.
- IC report top-right shows "Add to Deal Pipeline"; clicking creates (or reuses) an opportunity and navigates to the DD engine.

## Not in scope

- No schema changes to `interviews` (uses existing `status`/`ended_at`).
- No changes to the IC report content itself.
- No changes to the AppShell or nav.
