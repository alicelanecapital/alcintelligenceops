# Add "Required Documents" as its own workspace panel

## What's wrong

In Admin > Workspaces the panel tray lists 8 panels (Playbook Questions, DocBox, Live Transcript, Live Scoring, Risk Alerts & Follow-Ups, Manual Assessment, Stakeholder Brief, Report). There is no "Required Documents" panel, because in the Live Workspace the required-documents card is rendered *inside* the Playbook Questions block rather than as a standalone panel. So it can't be shown, hidden, moved or resized from a template.

A second reason it can look missing in a workspace: the card only renders when the current step actually has required documents configured for that round. If the round has none defined in the DD framework, nothing appears.

## What to build

1. Add a new panel `required_documents` ("Required Documents") to the workspace panel catalogue so it shows in the Admin > Workspaces tray and can be dragged onto the 6x10 grid like any other panel.
2. Give it a sensible default position on the grid (directly under Playbook Questions, above DocBox) and shift the default DocBox/lower blocks down by one row so nothing overlaps.
3. In the Live Workspace, move the existing "Required documents" card out of the Questions block into its own grid block, keeping the current styling: forest green header, "X of Y provided" counter, green tick for provided docs, strikethrough, "Outstanding" tag.
4. When the panel is enabled but the step has no configured documents, show a quiet placeholder ("No required documents configured for this step.") instead of rendering nothing, so it's obvious the panel is present and the framework just has no entries.
5. Existing saved templates: any layout saved before this change keeps its panels and automatically gains the new panel with its default geometry, so nobody has to re-edit their templates.

## Technical notes

- `src/lib/workspace-layouts.ts`: add `"required_documents"` to `WorkspacePanelKey`, `WORKSPACE_PANELS`, and `DEFAULT_WORKSPACE_BLOCKS`; `resolveWorkspaceLayout` already backfills defaults for keys missing from stored blocks, and panel lists saved earlier fall through to the full default set only when empty — so also treat an unknown/missing key in a stored `panels` array as enabled for this new panel.
- `src/components/LiveWorkspace.tsx`: extract the required-documents `Card` (currently inside the `questions` `GridBlock`) into `<GridBlock panelKey="required_documents">`, reusing `stepDetail.data.documents`, `providedCount` and `isDocumentProvided`.
- No database or schema changes; required documents continue to come from `dd_framework_documents` for the active round.
