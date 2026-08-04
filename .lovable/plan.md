# All 9 workspace panels on every playbook, Required Documents under the questions

## What's wrong today

- Of the three playbooks, only **Due Diligence** has all 9 panels saved. **Adhoc Meeting** and **Front Door Questionnaire** were saved with 8 panels (before Required Documents existed), so their stored layouts still describe the old 8-panel canvas.
- Required Documents has no saved position on those two playbooks, so it falls back to a default slot that can land on top of the Questions panel instead of sitting neatly beneath it.
- The Playbook Questions and Required Documents panels are drawn with a dark green outline, while every other panel (Transcript, Scoring, Risk Alerts, DocBox, Report) uses the standard light card outline — so those two frames look heavier than the rest.

## What will change

1. **9 panels enabled everywhere.** Every playbook's Live Workspace and the Admin > Workspaces designer will show all 9 panels switched on, including the two playbooks saved with only 8.
2. **Required Documents sits directly under Playbook Questions**, in the same column and width as the questions panel, with the DocBox and the panels below shifted down so nothing overlaps.
3. **Matching frames.** Playbook Questions and Required Documents get the same thin card outline as the other panels. Their forest-green title bars stay as they are — only the heavy green outer border goes.

## Resulting default canvas (6 columns)

```text
row 1   Stakeholder Brief (full width)
rows 2-4  Playbook Questions   | Transcript (rows 2-3)  | Risk Alerts
row 5   Required Documents     | Live Scoring (row 4)   | (rows 2-4)
row 6   DocBox (full width)
row 7   Manual Assessment (full width)
row 8   Report (full width)
```

## Technical notes

- `src/lib/workspace-layouts.ts`: update `DEFAULT_WORKSPACE_BLOCKS` to the geometry above (required_documents directly below questions, docbox moved to its own full-width row, manual_assessment/report shifted down). Extend the existing backfill so a stored layout missing a newer panel gets both the panel key **and** a sane block position rather than only the panel key.
- Database: one migration updating `public.toolkits.workspace_layout` for the Adhoc Meeting and Front Door Questionnaire playbooks so their saved panel list and blocks include `required_documents` at the position above — this is what makes the Admin designer show 9 of 9 for them, not just the runtime workspace.
- `src/components/LiveWorkspace.tsx`: drop `border-green-900/30` from the questions and required-documents `Card`s so they inherit the default border used by the other panels.
