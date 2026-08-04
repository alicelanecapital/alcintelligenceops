# Deal renaming, simpler New Deal modal, and grid layout for the Deal Pipeline Room

## 1. Simplify the "New Deal" modal (Deal Pipeline screen)

Currently the modal asks for: From a contact, Existing founder, Opportunity name, Industry.

New modal contains a single grouped picker:

- Label becomes **Company** (was "From a contact (optional)").
- Each option lists **Company first, then contact**: `Acme Software · Jane Doe` (falls back to just the contact name when no company is on file).
- Remove the **Existing founder**, **Opportunity name**, and **Industry** fields entirely.
- Save is enabled only once a company/contact is chosen; it uses the existing "create deal from contact" path, which already derives name and industry from that record.

## 2. Rename "Opportunity" to "Deal" across the interface

Visible text only — database tables, columns, routes and function names stay as they are.

- Buttons: "Add Opportunity" -> "Add Deal"; "Add opportunity" -> "Add Deal".
- Modal title: "New opportunity" -> "New Deal".
- Toasts: added / archived / restored / deleted / failed messages use "Deal".
- Empty states: "No deals yet", "No archived deals", "Add a deal to start the due diligence framework."
- Row icon tooltips: "Archive deal", "Restore deal", "Delete deal", "Delete this deal?".
- Deal profile page heading label "Opportunity" -> "Deal", plus the same word swap in the deal profile sections, overview bar, synopsis, and the Opportunities section heading on a contact page.
- Sidebar/nav label kept consistent with "Deals".

## 3. Deal Pipeline Room uses the full grid workspace layout

Today `/dd-interview/{deal}/{round}` renders one long vertical accordion of five sub-steps, which is why it still looks unchanged. It will be rebuilt on the same 6-column x 10-row draggable canvas the Live Workspace uses, honouring whatever layout is saved in Admin > Workspaces for the DD playbook.

Panel mapping for each round:

- `questions` — Round recording controls, "Questions to Cover This Round" accordion, AI-suggested and custom questions.
- `docbox` — the drag-and-drop DocBox frame (AI files each document into the right round and syncs to Google Drive), placed under Questions.
- `transcript` — live transcript and transcript upload.
- `scoring` — round scoring / gate assessment.
- `risk_alerts` — red flags, anomalies, document requests.
- `manual_assessment` — the interviewer's written assessment.
- `stakeholder_brief` — collapsed brief strip at the top.
- `report` — round output / analysis once generated.

The horizontal round stepper stays above the canvas unchanged. Any panel switched off for the playbook simply doesn't render, and panels keep their own internal scrolling so a dense round doesn't stretch the grid.

## Technical notes

- Modal: `AddOpportunity` in `src/routes/dd-engine.tsx` — drop `founderId`, `name`, `industry` state and the `createOpportunity` fallback branch; keep `createOpportunityFromContact`.
- Contact options sorted by company then name, formatted company-first.
- Grid: `src/components/DDInterviewEnhanced.tsx` sub-step accordion replaced by `WorkspaceGrid` + `GridBlock` from `src/components/WorkspaceGrid.tsx`, with layout resolved via `resolveWorkspaceLayout` for the DD playbook (same hook usage as `src/routes/interviews.$id.tsx`). All existing recording, analysis, sector-detection and gate logic is reused as-is, only re-parented into panels.
- No schema changes.
