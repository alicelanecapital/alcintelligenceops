## Reduce frames & polish visual density

### Calendar (`src/routes/calendar.tsx`)
- Lighten the "outside-month" day cell shading from current grey to a much lighter tint (e.g. `bg-muted/20` → near-white).
- Remove color-coded backgrounds/borders on event pills — render events as plain text rows (single neutral text color) with only a thin bottom divider between entries in a day cell. Keep the pastel public-holiday day shading and forest-green day header row as-is.

### Deal Pipeline (`src/routes/dd-engine.tsx`)
- Strip the `Card`/border wrapper on each deal record.
- Collapse each deal to a single row (name + company + status/actions on one line, no stacked metadata block).
- Replace the frame with a simple `border-b` divider between records.
- Keep click-to-open synopsis behavior intact.

### Synopsis modal (`src/components/OpportunitySynopsisDialog.tsx`)
- Widen the dialog by ~30% (`max-w-2xl` → `max-w-4xl`, or equivalent width bump) so content fits without scrolling.
- Add a **Download PDF** button in the modal header that exports the synopsis (Stakeholder Brief, Sector, AI Overview, DISC, Red Flags) as a PDF.
- Implementation: use `jspdf` + `html2canvas` to snapshot the synopsis content node client-side and save as `<Company>-synopsis.pdf`. Install both via `bun add`.

### DD Intelligence Engine admin (`src/routes/admin.dd-framework.tsx`)
- Remove all `Card`/framed wrappers around: Required Documents list, Questions list, and per-Round detail sections (applies to every round).
- Replace item frames with `border-b` dividers only.
- Keep section headings and spacing; remove nested container frames entirely so the screen reads as flat lists under headings.

### Out of scope
- No schema/business-logic changes.
- Forest-green underline for screen headings and calendar grid styling remain.
