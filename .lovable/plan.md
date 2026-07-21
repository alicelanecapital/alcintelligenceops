# Plan

## 1. Calendar — show event times
In `src/routes/calendar.tsx`, render start time (e.g. `09:30`) as a small prefix on each meeting/event chip. Keep existing color-coding (contact category for meetings, teal for events, orange for tasks). All-day items get no time prefix.

## 2. Accounts screen — Tabs
In `src/routes/admin.accounts.tsx`, wrap the current cards in a `Tabs` component (shadcn) with two tabs:
- **Accounts** — team members list, connected Google accounts + sub-calendars visibility, roles/admin management (everything currently on the page except signature + booking link).
- **Email** — `EmailSignatureCard` and `BookingLinkCard`, in that order.

Default tab: Accounts.

## 3. Meetings — hide private bracketed items
In `src/routes/interviews.index.tsx` (Meetings screen), extend the existing bracket-filter used elsewhere so any calendar item whose title contains `(smartify)`, `(nonastasia)`, or `(georgiaadams)` (case-insensitive) is hidden from BOTH the Private Meetings section and the Events section — not masked as "Unavailable", fully hidden.

## 4. Contact Detail — Tabbed redesign
Refactor `src/routes/contacts.$id.tsx`. Keep the top header (avatar, name/company, action buttons: Meet, Request Info, Edit, Delete). Below the header, replace the current 2-column card grid with a `Tabs` layout:

Tabs (in order):
1. **AI Overview** (default) — Sector (with confidence gating already in `SynopsisContent`), Company Description, Source Event + Date Met, Stakeholder Brief (full width baby-blue panel), DISC Profile (pulled from the contact's most recent opportunity, if any).
2. **Live Workspace** — Embed the live interview workspace layout (matches the uploaded screenshot: Interview Guide, Sub-topics, Live Transcript, Risk Alerts / Contradictions / Missing Evidence / Document Requests, Manual Assessment). Reuses `DDInterviewEnhanced` / the existing live-workspace panels bound to the contact's active or most recent meeting; if none, show a "Start meeting" CTA that opens `NewMeetingDialog`.
3. **Documents** — Grouped accordions per Round (Round 1, Round 2, …) listing files from `dd_interview_documents` for opportunities linked to this contact. Empty rounds show "No documents".
4. **Meeting History** — Current meetings list (with Start / dismiss actions preserved).
5. **Notes** — Contact notes (`c.notes`), editable inline (save via existing update path).
6. **Red Flags** — Aggregated `red_flags` across the contact's opportunities/rounds; "No red flags detected" empty state.
7. **Approved Deals** — Current approved-opportunities list.

Cards inside tabs use hairline borders (no heavy frames), matching current design tokens.

## Technical notes
- No schema changes.
- New files: `src/components/contact-tabs/AIOverviewTab.tsx`, `LiveWorkspaceTab.tsx`, `DocumentsTab.tsx`, `MeetingHistoryTab.tsx`, `NotesTab.tsx`, `RedFlagsTab.tsx`, `ApprovedDealsTab.tsx` to keep `contacts.$id.tsx` slim.
- Live Workspace tab reuses the existing components from the interview route; it will lazy-load the meeting record via `fetchContactMeetings` (most recent live/scheduled).
- Documents tab queries `dd_interview_documents` joined via opportunities → contact_id; groups by `round_number`.
- Red Flags tab reads `red_flags` JSON already stored on opportunities/dd_interviews.
- Accounts tabs: pure UI refactor, no data changes; signature persistence stays via `updateMyEmailSignature`.
- Meetings filter: single helper `isPrivateBracketed(title)` reused for both sections.
- Calendar times: format via `date-fns` `format(d, 'HH:mm')`; skip when `all_day` or when start/end span full day.
