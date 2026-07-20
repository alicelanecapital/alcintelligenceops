## 1. DD Framework admin → accordion rounds

Replace the two-column layout in `src/routes/admin.dd-framework.tsx` with a single vertical list. One `Accordion` (`type="multiple"`, all collapsed by default) — one `AccordionItem` per round.

**Header row (collapsed state):**
- Left: drag handle (grip) — reuses `@dnd-kit` from `SortableRoundsList`, activator scoped to the handle so the rest of the header still toggles expand/collapse. Reorder auto-saves via `reorderFrameworkRounds`.
- Middle: round number + title + muted subtitle (truncated).
- Right: inline Delete button (with existing confirm dialog) + accordion chevron.

**Expanded panel:** renders the existing `RoundMetaCard`, `QuestionsSection`, `DocumentsSection` unchanged in behavior. Detail data is lazy-fetched per round (`useQuery` gated on `expanded`). Newly added rounds auto-expand.

Top toolbar keeps only **Add Round**. Remove the standalone "Delete This Round" button and the "Drag to reorder" caption. Remove `RoundStepper` import if unused after refactor. No frames added inside expanded content — divider-only styling stays.

## 2. Synopsis → full-screen route

- New route `src/routes/opportunities.$id.synopsis.tsx` that renders the current `OpportunitySynopsisDialog` body inside `AppShell` as a full-page view, with a top bar containing **Back to pipeline** (navigates to `/dd-engine`) and **Download PDF**. Close = Back.
- Delete the modal-mode usage from `src/routes/dd-engine.tsx` (remove `OpportunitySynopsisDialog` and the row-click handler). Keep the reusable synopsis body — extract shared render into a `SynopsisContent` component that both the new route and the existing dialog can use, so nothing else that opens the dialog breaks. (Row click no longer opens synopsis.)
- Fix the overlap in the current dialog (uploaded screenshot: Download PDF hits the X close). In the new full-screen layout the buttons live in a top bar with clear spacing, so the collision disappears.

## 3. Deal Pipeline row actions

In `src/routes/dd-engine.tsx` each row's action cluster becomes:

`[View Synopsis] [Resume/Begin ▶] [Archive] [Delete]`

- **View Synopsis** — outline button, navigates to the new synopsis route.
- **Resume/Begin** — `Play` icon coloured bright green (`text-green-500`) with the label unchanged.

## 4. Approved / Rejected status + filters

Data model:
- Migration: add `pipeline_status` to `public.opportunities` (`text`, default `'active'`, check constraint `in ('active','approved','rejected')`). Backfill existing rows to `'active'`. No RLS/grant changes needed.

UI in `src/routes/dd-engine.tsx`:
- Replace the current `active | archived` `Tabs` with `active | approved | rejected | archived` and filter `opportunities` off `pipeline_status` (archived still uses the existing `archived` flag so nothing breaks).
- Row menu (or inline buttons on the row) gains **Approve** and **Reject** actions that call a new `setOpportunityStatus(id, status)` mutation, which invalidates `['opportunities']` and toasts.
- Approved/Rejected rows hide the Resume button (final state) but keep View Synopsis, Archive, and Delete.

Server:
- Extend `updateOpportunity` in `src/lib/founders-data.ts` (or add `setOpportunityStatus`) to accept `pipeline_status`. Cast to `any` where generated types haven't caught up yet, matching existing precedent.

## Out of scope
- No changes to interview-side `RoundStepper` used inside `/dd-interview/...`.
- No schema changes beyond the single `pipeline_status` column.
- No redesign of synopsis contents — only its container/route.
