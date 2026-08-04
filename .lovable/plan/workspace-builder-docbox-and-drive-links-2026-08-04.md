## Workspace builder, DocBox, and Drive links

### 1. Drag-and-drop workspace designer (Admin > Workspaces)
Replace the fixed 12-column preview with a real canvas: 6 columns x 10 rows.

- Each enabled panel becomes a draggable block on the grid with a stored position and span (col, row, colSpan, rowSpan).
- Drag to move; a small handle on the right/bottom edge resizes the span. Blocks snap to grid cells.
- Panels toggled off drop out of the canvas and sit in an "available panels" tray you can drag back in.
- Reset To Default restores the current layout (questions left, transcript/scoring centre, risk alerts right, full-width panels below) expressed on the 6x10 grid.
- Save writes the grid positions into the playbook's existing `workspace_layout` JSON, extended from `{ panels: [...] }` to `{ panels: [...], blocks: [{ key, col, row, colSpan, rowSpan }] }`. Old rows without `blocks` keep working via the default layout.
- The Live Workspace (`interviews/$id` and the DD round page) renders from those blocks instead of hardcoded column spans.

### 2. Live Workspace header
Show the company name as the main title, top left; the contact/founder name moves to the smaller secondary position (or drops when it duplicates the company).

### 3. Stakeholder Brief
Bold the contact name inside the Stakeholder Brief panel.

### 4. DocBox (all playbooks, under the Questions panel)
A new workspace panel: an upload/drag-and-drop dropzone plus the list of documents filed against this meeting.

- Drop or browse files; each upload goes to backend storage first so nothing is lost.
- AI classification: the file name and extracted text are sent to a server function that decides which step/round of the *active playbook* the document belongs to (for Due Diligence that is Round 1-5; for other playbooks it is that playbook's own steps). The result is stored with the document, and the doc is listed under that step even if it was dropped while a different step was open.
- Classified documents feed the existing analysis inputs, so a Round 4 document dropped during Round 1 still contributes.
- Documents are also pushed to Google Drive. On the first upload for a company, a subfolder named after the company is created inside the shared Drive folder and every later file for that company goes into it (the folder id is cached on the company record so it is created once, not per upload). No round subfolders — the round/step lives in our database, and the Drive link is stored on the document row.
- DocBox appears in the Admin > Workspaces panel list so it can be positioned or switched off per playbook.

### 5. Documents tab -> Drive
Every company/contact Documents tab gets an "Open Google Drive folder" button linking to the shared folder:
`https://drive.google.com/drive/u/0/folders/1_AGnJIRYZYvTrdonrql2bcsuWX3Gn9XH`
The existing per-round list stays below it.

### 6. Fix Report template loading
Report templates currently fail to load after the recent access-policy tightening. Confirm the exact failure (permission vs missing rows) with a direct query, then fix the policy/grant so admins can read and edit templates and their sections again.

### Technical notes
- Grid layout: `src/lib/workspace-layouts.ts` gains block geometry + resolver; `src/routes/admin.workspaces.index.tsx` becomes a 6x10 drag/resize canvas; `src/routes/interviews.$id.tsx` and `src/components/DDInterviewEnhanced.tsx` render `grid-cols-6` / `grid-rows-10` from stored blocks.
- DocBox uses the existing `dd_interview_documents` table (add `drive_file_id`, `classified_step`, `classification_confidence`) and a private storage bucket for the raw file.
- Drive access needs the Google Drive connector linked to this project — I'll open the connect card during implementation; until it's connected, DocBox stores files in our backend and shows the Drive push as pending.
- Classification runs through a new server function using Lovable AI (no extra key).
