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

### Drag-and-drop round reordering (Admin → DD Intelligence Engine)
- Make the round list in the left rail/stepper drag-and-droppable so the sequence of rounds can be changed and saved. New position persists across sessions and is reflected everywhere rounds are listed (admin stepper + `RoundStepper` in the Deal Pipeline interview view).
- **Schema**: add `sort_order integer` column to `dd_framework_rounds` (migration). Backfill from existing `round` values so the initial order is unchanged. Leave the existing `round` integer alone — it stays the stable identifier used by `dd_framework_questions.round`, `dd_framework_documents.round`, `dd_interviews.round`, so historical interview data is not disturbed.
- **Query order**: change `fetchAllFrameworkRounds` and any other rounds fetcher to `.order("sort_order")` instead of `.order("round")`.
- **Reorder API**: add `reorderFrameworkRounds(items: { round: number; sort_order: number }[])` in `src/lib/dd-framework-admin.ts` that batches `update` calls (mirrors existing `reorderFrameworkQuestions` pattern).
- **UI**: use `@dnd-kit/core` + `@dnd-kit/sortable` (install via `bun add`) — same libs already used elsewhere or added if not — with a small grab handle on each round row in the admin left rail. On drop, recompute `sort_order` for the affected items and call the reorder API; invalidate the `dd-framework-rounds` query so both the admin screen and the interview stepper repaint in the new order.
- **Save UX**: auto-persist immediately on drop (no separate "Save order" button), with toast confirmation on success/failure and optimistic reorder in the local list.

### Out of scope
- No schema/business-logic changes beyond the new `sort_order` column on `dd_framework_rounds`.
- Round numbers themselves stay stable — reordering only changes display order, not the underlying `round` identifier or any child rows.
- Forest-green underline for screen headings and calendar grid styling remain.
