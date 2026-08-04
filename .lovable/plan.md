# Lock in the current workspace layout as the default, and match the panel frames

## Current state

All three playbooks (Due Diligence, Front Door Questionnaire, Adhoc Meeting) now have all **9 panels enabled** and the **same saved geometry**, with Required Documents sitting directly under Playbook Questions. That is the layout you just edited and saved.

Two things still don't match it:

- The code's built-in default layout differs from what you saved, so any new playbook — or a playbook whose layout is ever reset — comes up with the old arrangement.
- The Playbook Questions and Required Documents panels are drawn with a heavy dark-green outline, while Transcript, Scoring, Risk Alerts, DocBox and Report use the standard thin card outline.

## What will change

1. **Your saved arrangement becomes the default.** The built-in default layout is updated to exactly the layout currently saved on your playbooks, so new playbooks and the "Reset to default" button both produce this canvas:

```text
row 1     Stakeholder Brief (full width)
rows 2-3  Playbook Questions | Transcript          | Risk Alerts
row 4     Required Documents | Live Scoring        | (rows 2-4)
row 5     DocBox (full width)
row 6     Manual Assessment (full width)
row 7     Report (full width)
```

2. **All 9 panels stay enabled by default**, with Required Documents in the slot under the Playbook Questions panel.

3. **Matching frames.** Playbook Questions and Required Documents get the same thin card outline as every other panel. Their forest-green title bars stay exactly as they are — only the heavy green outer border goes.

## Technical notes

- `src/lib/workspace-layouts.ts`: set `DEFAULT_WORKSPACE_BLOCKS` to the geometry saved on the playbooks today (questions 1/2 span 2x2, required_documents 1/4 span 2x1, docbox 1/5 full width, transcript 3/2 span 2x2, scoring 3/4, risk_alerts 5/2 span 2x3, manual_assessment 1/6, report 1/7, stakeholder_brief 1/1). Keep `DEFAULT_WORKSPACE_LAYOUT` as all 9 keys and keep the `required_documents` backfill so any older stored layout still resolves with the panel on.
- `src/components/LiveWorkspace.tsx`: remove `border-green-900/30` from the questions and required-documents `Card`s so they inherit the default card border.
- No database change is needed — the stored layouts already match and stay untouched.
