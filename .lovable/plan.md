## Live Transcript accordion + Live Scoring badge colors

### 1. Live Transcript accordion (`src/routes/interviews.$id.tsx`)
- Wrap the Live Transcript card in a shadcn `Accordion` (type="single", collapsible) with one item.
- Header row keeps the current controls (Speaker toggle, Start/Stop, Upload transcript). Stop propagation on those controls so clicks don't toggle the accordion.
- Title text:
  - Default / while recording: `Live transcript`.
  - After a transcript upload OR after Stop/finalize (utterances exist and `recording === false`): show meeting date + time, e.g. `Transcript · Jul 23, 2026 · 14:32`. Source: `interview.started_at` → `interview.ended_at` → earliest utterance timestamp → now.
- Default open state: open while `recording === true` or utterances.length === 0. Auto-collapse after upload completes and after Stop finalizes. User can still re-expand.
- Body is the existing transcript list + speaker editor, unchanged.

### 2. Colour the Live Scoring badges (`src/routes/interviews.$id.tsx`)
- The Live Scoring panel currently renders each score as a neutral badge. Give the badges semantic colours based on the score value:
  - High (≥ 8 / 10): pastel forest green background, dark green text — matches app accent.
  - Mid (5–7): pastel amber background, dark amber text.
  - Low (< 5): pastel red background, dark red text.
  - No score yet / null: existing neutral muted badge.
- Use the shared badge component with a small `scoreTone(value)` helper local to the file. No new tokens; use existing Tailwind pastel utilities already used elsewhere (e.g. `bg-green-100 text-green-800`, `bg-amber-100 text-amber-800`, `bg-red-100 text-red-800`) to stay consistent.
- Keep the topic/label text unchanged; only the badge pill colour changes.

### Technical notes
- Single file: `src/routes/interviews.$id.tsx`.
- Accordion from `@/components/ui/accordion`. Date formatting via `date-fns` `format(d, "MMM d, yyyy · HH:mm")`.
- Local state `transcriptOpen`; flip to `false` in the upload-success handler and after auto-finalize on Stop.
- No schema, server function, or cross-route changes.
