
## 1. DISC card — spell out D/I/S/C

In `OpportunityOverviewBar.tsx` DISC panel, render each dimension label as e.g. `D — Dominance`, `I — Influence`, `S — Steadiness`, `C — Conscientiousness` (currently just the initial). Same tweak inside `DiscProfileCard.tsx` for consistency.

## 2. Stakeholder Brief frame — baby blue, full-width, no nested box

In `OpportunityOverviewBar.tsx`:
- Swap indigo palette → pastel baby blue: `bg-sky-50 border-sky-200`, text `text-sky-900/800/700`.
- Remove the inner white attendee cards (`bg-white rounded border …`) and the 2-column grid — render attendees inline as a flat list spanning the full width of the frame (name · role — org, followed by notes). Talking points and relationship history stay as before, full-width.

## 3. Red Flags frame per round

Add a "🚩 Red Flags" frame inside each round in `DDInterviewEnhanced.tsx`, rendered under the AI Questions / above the Human Assessment. Content shows:
- AI-analysed red flags from the transcript (`aiAnalysis.redFlags`) and from received documents (`aiAnalysis.documentRedFlags` / missing required documents).
- If none: "No red flags detected — continue to verify claims in the next round."

Persist to `dd_interviews.red_flags jsonb` via a migration; auto-populate whenever transcript analysis or document sync runs (extend the existing `generateAnalysisReport` call to also return red flags and store them). No manual regenerate button.

## 4. Sector detection is stale / mismatched

Problem: opportunity list shows "Software" (keyword fallback matched "app"/"platform"), detail page shows "not detected", and the actual business is aesthetics/dentistry — which isn't in the current A–E module list.

Fixes:
- Broaden `SECTOR_KEYWORDS` in `src/lib/dd-sector-detection.ts` with a sixth bucket **F — Health & Wellness** (aesthetics, dentistry, clinic, medical, cosmetic, dermatology, wellness) and register it in `SECTOR_MODULES`.
- Require confidence ≥ 40 before writing `dd_detected_sector`; below that store `null` so the list badge stops showing false "Software".
- After every round save, copy `dd_interviews.detected_sector`/`sector_confidence` up to `opportunities.dd_detected_sector`/`dd_sector_confidence` (currently only written on first detection) so the pipeline list and detail page stay in sync.
- Also read from `founder.sector` / `company.industry` as a seed hint when running detection so Anastasia's known aesthetics/dentistry classification is picked up on round 1.

## 5. Deal Pipeline — click card → Synopsis dialog

In `src/routes/dd-engine.tsx`:
- Remove the `sector` badge from list-record items (per request).
- Wrap each card body in a clickable area that opens a new `<OpportunitySynopsisDialog>` (new component). The dialog reuses the existing sub-components to show:
  - Detected Sector
  - Stakeholder Brief
  - AI Overview
  - DISC Profile
  - Red Flags (aggregated across rounds)
- The **Resume/Begin** button keeps its own click handler with `stopPropagation` so it still navigates straight to the round without opening the synopsis.
- In `src/routes/dd-interview.$opportunityId.$round.tsx` remove `<OpportunityOverviewBar>` from the top of the round page — the synopsis now lives in the dialog, not above every round. Keep `RoundStepper` and round content.

## 6. Question shading

In `DDInterviewEnhanced.tsx`:
- Remove background shading from all standard round question containers (drop `bg-gray-50`/`bg-blue-50`/`bg-emerald-50/40` wrappers, keep only borders).
- Transcript block stays `bg-gray-100` (unchanged).
- **AI Questions** frame → pastel teal (`bg-teal-50 border-teal-200`, headings `text-teal-900`).
- **Custom Questions** frame → pastel orange (`bg-orange-50 border-orange-200`, headings `text-orange-900`).

## Technical notes

- New migration: `alter table dd_interviews add column red_flags jsonb;` plus `alter table opportunities` no-op (columns already exist).
- New file: `src/components/OpportunitySynopsisDialog.tsx` composing existing DISC / overview / brief renderers so the round page and the dialog stay visually consistent.
- No changes to server auth, RLS, or unrelated modules.
