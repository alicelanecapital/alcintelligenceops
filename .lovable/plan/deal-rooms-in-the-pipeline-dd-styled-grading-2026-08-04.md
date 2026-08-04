# Deal Rooms in the Pipeline + DD-styled Grading

## 1. DD workspaces live in Deal Pipeline

Today opening a deal redirects to `/interviews/$id`, so a DD round looks and feels like a private meeting.

- Extract the Live Workspace body from `src/routes/interviews.$id.tsx` into a shared `LiveWorkspace` component (identical layout, panels and grid — nothing changes visually).
- `/dd-interview/$opportunityId/$round` stops redirecting: it resolves the deal's workspace and renders the same `LiveWorkspace` in place, in a Deal Pipeline context — deal name + company in the header, "Back to Deal Pipeline", and a DD-themed frame.
- Meetings screen keeps listing only private meetings; deal-linked workspaces stay in Deal Pipeline (they carry `opportunity_id`), so a DD round is never orphaned in Meetings.

## 2. DD Template colours and shading for grading

- Apply the DD framework palette to the grading surfaces: forest green headers/borders, white panel bodies, baby-blue brief shading — replacing the current teal question accordion and grey scorecard.
- A–E grades become bright, solid colour chips (not pale tints): A emerald, B green, C amber, D orange, E red, white text; "Ungraded" stays a quiet neutral chip.
- Scorecard rows keep Detected / Clear / Unknown but pick up the same brighter red / green / neutral treatment.

## 3. Pulsing red alert for red flags and risks

- When any flag is `Detected`, or a Risk alert of medium+ severity exists, show a pulsing red icon: on the Risk Alerts panel header, on the affected question row, and next to the step in the stepper — so it's noticeable mid-interview.
- Uses a subtle CSS pulse animation; stops as soon as nothing is flagged.

## 4. Ticks for required documents provided

- Cross-reference each step's required documents against uploaded DocBox documents for that workspace (name match plus the AI-assigned step).
- Provided documents get a green tick and a de-emphasised row; outstanding ones stay plain with an "Outstanding" marker, plus a "3 of 7 provided" counter on the panel header.

## 5. Remove AI body-language assessment entirely

- Delete the Behavioral Signals panel and its normalizer from the workspace, `src/lib/video-analysis.functions.ts`, `src/lib/extract-video-frames.ts`, and `src/lib/interview-video-storage.ts`, plus the video upload entry point and any references in reports/synopsis copy.
- Existing `behavioral_signals` analysis rows are removed by migration and the `interview-videos` bucket is dropped, so nothing lingers in the UI or the data.

## Technical notes

- New shared component: `src/components/LiveWorkspace.tsx`; both `/interviews/$id` and the deal route render it with a `context: "meeting" | "deal"` prop that only changes the header/breadcrumb.
- Grade/flag tone helpers move into `src/lib/badge-colors.ts` so PDF/report surfaces reuse the same chips.
- Document-provided matching lives in `src/lib/workspace-documents.ts` as a pure helper, unit-testable and reused by DocBox.
- Migration: delete `interview_analyses` rows with `kind = 'behavioral_signals'` and remove the `interview-videos` storage bucket and its policies.
