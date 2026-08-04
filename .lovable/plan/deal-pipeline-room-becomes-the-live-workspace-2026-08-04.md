# Deal Pipeline Room becomes the Live Workspace

The DD round page is currently its own screen with its own panel markup, which is why it never looks like the Live Workspace. Instead of restyling it, the deal room will open the actual Live Workspace, using the DD Intelligence Engine as its playbook so the five rounds become the workspace's steps.

## What changes for you

- Clicking a deal (or Resume) in the Deal Pipeline opens the same workspace you see for meetings: horizontal round stepper on top, then the 6-column canvas with Questions (with AI grades and scorecards), DocBox, Live Transcript, Live Scoring, Risk Alerts & Follow-Ups, Manual Assessment and Report.
- Panel positions and which panels show come from the DD playbook layout saved in Admin > Workspaces — identical rendering to meetings.
- The header keeps the company name top-left with the contact as the secondary name, and the round stepper still switches Round 1-5.
- Round-specific DD extras (round gate / pass assessment, expert input, sector detection, anomaly questions, document requests) keep working: they render inside the matching workspace panels (gates + expert input below the canvas as today, sector and red flags in Risk Alerts).
- Existing deal data is preserved: transcripts, assessments, analyses and red flags already recorded per round stay attached to that round and appear in the corresponding panels.

## How it works

1. Extract the current `LiveView` from `src/routes/interviews.$id.tsx` into a shared `src/components/LiveWorkspace.tsx` with no behaviour change; `interviews.$id` renders it as before.
2. Give it optional deal context: `dealId`, the active step (round) and a `stepFromUrl` control, plus optional extra slots rendered under the canvas (round gates / expert input).
3. `/dd-interview/$opportunityId/$round` resolves (get-or-create) one `interviews` row for the deal — `deal_id` = opportunity id, `contact_id`/`founder_name`/`business_name` from the deal, `playbook_id` = the DD Intelligence Engine toolkit — then renders `LiveWorkspace` with the round as the current step. No new rows per round; the round is the step.
4. Round-scoped DD state continues to live in `dd_interviews` (one row per opportunity+round, get-or-create as today). The reusable per-round logic in `DDInterviewEnhanced.tsx` (recording/analysis/gate/sector/anomaly/doc-sync mutations) is moved into a `useDDRound(opportunityId, round)` hook so the workspace panels can drive it; the old accordion markup and the duplicated `DD_LAYOUT`/nested-`GridBlock` code are deleted.
5. Questions come from the playbook shape (`fetchPlaybookShape` / `fetchPlaybookStepDetail`) for the DD toolkit, so DD questions render through the same teal accordions with AI grading via `gradeStepQuestions`.
6. DocBox is passed the resolved interview id, deal company id and DD steps, so dropped documents still file themselves into the right round and sync to Drive.

No schema changes.

## Notes

- `src/components/DDInterviewEnhanced.tsx` shrinks to the DD-only panels/hook; nothing else imports it.
- Deal Pipeline "Resume" links and the round stepper keep the same URLs, so bookmarks stay valid.
