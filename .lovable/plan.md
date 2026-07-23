## Changes

1. **Transcript accordion = one per session, not per utterance**
   - In `src/routes/interviews/[id].tsx`, replace the per-utterance accordion with a single accordion item per transcript session.
   - Header: `TRANSCRIPT · JUL 23, 2026 · 17:03` (uppercase, forest green pill, white text) using the transcript's first-utterance timestamp / `finalized_at` / `created_at`.
   - Expanded content shows the utterance list as today (timestamp, speaker badge, text, edit controls), on a plain neutral background, no per-utterance accordion.
   - Multiple transcripts are stacked newest-first; accordion type `multiple` so any can be open.
   - Start/Stop and Upload-transcript controls stay in the frame header above the accordion list.

2. **Colour live scoring badges by score level**
   - Very low / Low (< 5): pastel red (`bg-red-100 text-red-800`).
   - Medium (5–7): pastel amber (`bg-amber-100 text-amber-800`).
   - High (≥ 8): pastel forest green (`bg-green-100 text-green-800`).
   - Missing/invalid: neutral badge.

3. **Dynamic transcript-frame height**
   - The Live Transcript frame/accordion should size to its content instead of a fixed tall height.
   - Collapsed: only the forest green transcript header pill shows.
   - Expanded: frame grows to fit the utterance list, with a sensible max-height and overflow-y auto if it grows past the viewport.
   - Remove the current fixed-height frame that leaves empty space below the transcript.

No schema changes. No other routes change.