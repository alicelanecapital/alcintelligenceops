## Recording state + per-utterance accordion

### 1. Start/Stop button exclusivity (`src/routes/interviews.$id.tsx`)
- Live-transcript header already renders Start XOR Stop via `!recording ? <Start/> : <Stop/>`. Confirm this remains the only rule: no Stop button while `recording === false`, no Start while `recording === true`. After Stop is pressed, `setRecording(false)` runs, so Start reappears automatically for the next session.
- Remove the second Stop button in the top page header (the one next to the status badge — `iv.status === "live"` block). It duplicates the transcript-frame Stop and shows up even when the user hasn't started this session. Users control recording only from the transcript frame.
- "Live" indicator: the header strip currently shows `Live` / `Idle` driven by `recording` — keep this. Also change the top status Badge so it only reads `live` while `recording === true`; when not recording, fall back to the interview's persisted status (`completed` / `draft`) without showing "live".

### 2. Each transcript utterance as a collapsed accordion
- Inside the Live Transcript accordion body, render each utterance as its own accordion item, collapsed by default.
- Trigger row (the collapsed pill): forest green background, white text. Shows timestamp, speaker badge, and a one-line preview of the utterance (truncated).
- Expanded content: full utterance text plus the existing Edit affordance (Textarea + Save).
- Use shadcn `Accordion type="multiple"` so users can open several at once, all collapsed initially.
- Styling: `bg-green-800 text-white` (forest green, matches app accent) for the trigger; hover keeps the same tone slightly lighter. Chevron and speaker badge switch to white/translucent variants for contrast. Expanded body sits on a plain white/neutral background so the text stays readable.
- File: `src/components/UtteranceRow` (defined inline in `src/routes/interviews.$id.tsx`) gets rewritten to render an AccordionItem instead of the current flat row.

### Technical notes
- Single file: `src/routes/interviews.$id.tsx`.
- Reuse `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` already imported.
- No schema, server function, or route changes.
