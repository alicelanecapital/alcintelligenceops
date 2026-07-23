
## Goal

On a Contact, the **Live Workspace** tab becomes the single place to start and run a meeting. The interviewer picks a Playbook, the workspace renders that playbook's stepper across the top and its questions on the left as they progress through stages, and the transcript / risk / analysis rails on the right stay as they are. Every completed session becomes a Live Workspace record listed on the tab with date + time. Stakeholder Brief and Meeting History collapse into the AI Overview tab.

## Contacts page — tab changes

- **Remove tabs:** `Stakeholder Brief`, `Meeting History`.
- **AI Overview** absorbs both:
  - New accordion `Stakeholder Brief` (moves `StakeholderBriefTab` content in, keeps auto-generate on first view).
  - New accordion `Meeting History` (moves `MeetingHistoryTab` content in).
  - Existing accordions stay: Company Description, DISC, Red Flags.
  - **Red Flags aggregation** widens to include flags surfaced in Live Workspace sessions (not just DD interviews) so past meetings retroactively influence the Overview — pull `red_flags` from `interviews` for this contact in addition to `dd_interviews`.
- Remaining tabs: `AI Overview`, `Live Workspace`, `Documents`, `Approved Deals`, `Notes`.

## Live Workspace tab — new empty state (start form)

When there is no live/in-progress session for the contact, render an inline start form (no more "Start meeting" button that opens `NewMeetingDialog`):

- **Playbook** — Select dropdown, listed above Industry, populated from `toolkits` table. Default selection: the `DD Intelligence Engine` playbook. Placed above the Industry field.
- **Industry** — text input (prefilled from contact).
- **Start meeting** button → creates an `interviews` row with `playbook_id` set, navigates to the workspace.

`NewMeetingDialog` is no longer used for the contact flow (kept for the standalone Meetings screen).

## Live Workspace record list

Below the start form / active session, list previous sessions for this contact as **Live Workspace records** (rows, forest-green divider style consistent with the rest of the app):

- Title, meeting date + time (created_at / started_at), status badge, playbook name.
- Click → opens the session in `/interviews/$id`.

This replaces the "no live meeting" empty card and the current "Open workspace" one-liner.

## Interview workspace (`/interviews/$id`) — playbook-driven layout

Replace the current top strip and left "Interview guide" column with a playbook-aware structure that mirrors the DD Intelligence Engine:

1. **Horizontal stepper** across the top using the existing `RoundStepper` (horizontal orientation). Steps come from the selected playbook:
   - If playbook = DD Intelligence Engine → steps = `dd_framework_rounds` (Round 1–5).
   - If playbook is another `toolkits` row without configured rounds → single "Meeting" step (safe fallback for the DD-only current data).
   - Selecting a step updates a local `currentStep` state (does not force navigation).
2. **Remove the current 5-cell top strip** (Founder / Business / Stage / Elapsed).
3. **Remove the left-hand "Interview guide" + "Sub-topics" cards.** Replace with a **Questions column** that lists the current step's questions:
   - Sourced from `dd_framework_questions` for the current round (for DD playbook), styled the same as the DD engine (pastel teal for AI questions, pastel orange for custom).
   - Includes required-documents list under the questions.
4. **Middle column (Live transcript + Live scoring)** — unchanged.
5. **Right column (Risk alerts, Follow-ups, Missing evidence, Contradictions, Doc requests)** — unchanged.
6. **Manual assessment + body language accordions** at the bottom — unchanged.

The tab strip at the top of the workspace (`Pre-interview brief / Live workspace / IC report`) stays as-is.

## Data model

Add one column so the workspace can render the right playbook and so records can show which one was used:

```
public.interviews: playbook_id uuid null references public.toolkits(id)
```

`startMeetingForContact` and the new inline start form accept `playbookId`; brief generation and analysis logic are unchanged. Existing rows keep `playbook_id = null` and render with the DD default fallback.

## Red flags → AI Overview

The Red Flags accordion in `AI Overview` today only reads `dd_interviews.red_flags` via opportunity ids. Extend the query to also pull red_flag entries stored on `interviews` rows (Live Workspace sessions) tied to this contact, merged and deduped, so retrospective flags from any past meeting surface on the Overview.

## Technical notes

- Files touched:
  - `src/routes/contacts.$id.tsx` — remove two tabs; add Stakeholder Brief + Meeting History accordions into `OverviewTab`; rewrite `LiveWorkspaceTab` (start form + records list); widen red-flag query.
  - `src/routes/interviews.$id.tsx` — replace top strip + left column with `RoundStepper` (horizontal) and a questions column driven by playbook rounds/questions; keep transcript + right rail + bottom sections intact.
  - `src/lib/interviews.ts` / `interviews.functions.ts` — thread `playbookId` through `startInterview` / `startMeetingForContact`; return `playbook_id` on reads.
  - `src/lib/toolkits.ts` — add a small `getToolkitById` helper.
  - New helper `src/lib/playbook-questions.ts` — given a playbook id, return rounds + questions (DD engine path today, extensible later).
  - Migration: `ALTER TABLE public.interviews ADD COLUMN playbook_id uuid REFERENCES public.toolkits(id);`
- `NewMeetingDialog` is left in place for the standalone Meetings screen but not used from the contact page.
- No other UI/business-logic changes.
