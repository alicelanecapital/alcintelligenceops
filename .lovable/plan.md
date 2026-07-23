# Compact the Engagements workspace

The current screen stacks a 3-column grid (guide / transcript / AI rails) and then a large Manual Assessment + Observations row underneath, making the page very tall with lots of empty vertical space. This plan rearranges frames so everything important is visible without scrolling forever.

## Layout changes (`src/routes/interviews.$id.tsx`)

1. **Slimmer header strip**
   - Reduce vertical padding on `Strip` (from `py-3` to `py-2`) and shrink the `font-serif text-lg` value line to `text-base`.

2. **Two-column workspace instead of three**
   - Collapse the left rail (Interview guide + Sub-topics + Suggested follow-ups) and the right rail (Live scoring + Risks + Contradictions + Missing evidence + Document requests) into a single left sidebar, `col-span-3`, with tabs: **Guide**, **AI signals**, **Docs**.
   - Center transcript widens to `col-span-6`.
   - New right column `col-span-3` holds **Manual assessment** + **Observations** as stacked compact cards (moved up from below).

3. **Merge Manual Assessment + Observations**
   - Remove the separate bottom row.
   - Inside the right column, one card titled "Notes" with an inner tab strip: **Assessment** (6 note boxes in a single column, small textareas) and **Observations** (4 compact note boxes). This eliminates the tall bottom row entirely.

4. **Transcript frame**
   - Keep the session accordion but cap its inner scroll at `max-h-[55vh]` (down from 65vh) and remove the outer card `p-4` extra breathing room to `p-3`.
   - Move the Speaker toggle + Start/Stop + Upload transcript into a compact toolbar row that wraps only when needed.

5. **AI signals tab (left sidebar)**
   - Live scoring badges at top, then Risks / Contradictions / Missing evidence as collapsible sections (default: Scoring open, others closed) so the rail stays short.
   - Suggested follow-ups moves under the Guide tab beneath Sub-topics.

6. **Spacing pass**
   - Reduce all card `p-6` → `p-4`, `space-y-3` between rail cards → `space-y-2`.
   - Container padding `py-6` → `py-4`.

## Result

Single-viewport layout: header strip → 3-column body (Guide/AI tabs · Transcript · Notes tabs). No secondary bottom row. Screen height roughly halved.

## Technical notes

- Only `src/routes/interviews.$id.tsx` is edited. No data-layer or server-fn changes.
- Existing components (`NoteBox`, `RailList`, `UtteranceRow`, session grouping) are reused as-is; only their container arrangement changes.
- Tabs use the existing shadcn `Tabs` component already imported elsewhere in the file (add import if missing).
