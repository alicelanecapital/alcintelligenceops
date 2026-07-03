# AI Interview & Assessment Engine

An Investment Committee that sits beside the interviewer: record → live transcript → live AI analysis → memo suite. Transcript-only (audio discarded), Lovable AI (`openai/gpt-4o-mini-transcribe` + `google/gemini-3-flash-preview`), reachable both from the Founders page and a new top-level Interviews module.

## User flow

1. **Interviews (new nav)** — list of past + in-progress interviews, "New interview" CTA that picks any Founder (or starts blank).
2. **Founder profile** — "Start interview" shortcut that pre-seeds founder/business.
3. **Pre-interview Brief** — auto-generated from founder + org + prior deals/notes: known risks, suggested focus areas, opening questions, missing docs.
4. **Live Workspace (`/interviews/$id/live`)** — the multi-panel screen. One click starts recording; everything else updates in real time.
5. **Post-interview** — memo suite + IC recommendation dashboard.

## Screen layout — live workspace

Bloomberg-terminal density on white, midnight-blue (#0B1F3A) accents, generous gutters, tabular numbers. Grid:

```text
┌───────────────────────────────────────────────────────────────────────┐
│ HEADER STRIP  Founder · Business · Stage · Elapsed · ● REC · Stop     │
├──────────────┬────────────────────────────┬───────────────────────────┤
│ INTERVIEW    │ LIVE TRANSCRIPT            │ AI ANALYSIS               │
│ GUIDE        │ (paragraphs w/ timestamp,  │   Confidence gauges       │
│ · Stages     │  speaker, confidence,      │   Risk alerts             │
│ · Current Q  │  edit-in-place)            │   Contradictions          │
│ · Suggested  │                            │   Missing evidence        │
│   follow-ups │                            │   Live scoring            │
│   + reason   │                            │                           │
├──────────────┴────────────────────────────┼───────────────────────────┤
│ MANUAL ASSESSMENT (interviewer private)   │ DOC REQUESTS (auto-built) │
└───────────────────────────────────────────┴───────────────────────────┘
```

Left rail collapses to icons. Middle transcript is the tall column. Right rail is tabbed (Analysis / Risks / Contradictions / Evidence).

## Real-time pipeline

- Browser captures mic with Web Audio API → encodes 16 kHz mono WAV windows (~4 s), uploads each to `/api/interviews/$id/transcribe-chunk`.
- Server route posts window to `POST https://ai.gateway.lovable.dev/v1/audio/transcriptions` (`openai/gpt-4o-mini-transcribe`, `stream: true`); streams SSE deltas back over the same response.
- Client appends deltas to the active paragraph; on `transcript.text.done` the paragraph is committed to `interview_utterances` with timestamp + confidence + speaker guess.
- Every N committed paragraphs (debounced 8 s) the client calls `analyzeInterview` (`createServerFn`, Gemini 3 Flash) with the rolling transcript + prior facts. Response is a structured `Output.object` schema: `{ facts[], risks[], contradictions[], missing_evidence[], follow_up_questions[], scores{…} }`. Results merge into `interview_analyses` and stream into the right rail.
- Contradictions: each extracted fact is stored in `interview_facts` (subject, predicate, value, source utterance). The analyzer receives the running fact list and flags conflicts explicitly.
- Speakers: two-speaker heuristic (audio-level channel + role tagged in header). Interviewer can rename any speaker inline; the correction is fed back into the analyzer prompt.
- Audio is **not** persisted — clickable playback is deferred to a later phase.

## Interview stages

Framework baked in as data (Founder / Business / Financial Health / Operations / Market / Investment) with sub-topics as listed in the brief. The AI receives the current stage as prompt context and biases follow-ups toward it. Interviewer can jump stage manually; the guide highlights coverage and gaps.

## Post-interview memo suite

Triggered by "End interview". One `finalizeInterview` server fn runs Gemini with the full transcript + facts + analyses and returns a structured bundle stored in `interview_reports`:

- Executive Summary · Founder Summary · Business Summary
- Risk Assessment (Alice Lane framework — Founder / Cash Leakage / Revenue Quality / Debt / Tax / Expansion / Minority / Liquidity / Exit)
- Mess Classification (Green/Amber/Red/Black/Strategic) with evidence
- Investment Readiness scorecard (Confidence, Evidence Completeness, Founder Readiness, Operational Maturity, Financial Visibility, Growth Readiness) — each score carries its "why"
- IC Recommendation (Proceed / Proceed with Conditions / Request More Evidence / Observe / Decline) + Strengths / Weaknesses / Value Creation / Return Pathways / Suggested Deal Structure / Equity Range / Priority Workstreams
- Outstanding questions · Evidence required · Recommended next steps · 100-Day Plan · Suggested specialists

Rendered as a print-friendly "IC Report" route; PDF export deferred.

## Learning engine (v1 seed)

- Every question the AI suggests is logged in `question_suggestions` with `stage`, `reason`, whether interviewer used it, and whether it produced a flagged fact/risk/contradiction downstream.
- Simple weekly aggregation (`question_effectiveness` view) surfaces "Recommended Interview Improvements" — top-signal questions and stages where the AI keeps missing. No real ML yet; the data model is right so ranking can be swapped in later.
- Knowledge graph gets a data model (`kg_nodes`, `kg_edges` linking founders / businesses / industries / risks / patterns) populated from extracted facts. Visualization deferred to a later phase.

## Data model (new tables)

- `interviews` — founder_id, organisation_id, deal_id, status (draft/live/completed), stage_pointer, started_at, ended_at, interviewer_id, brief JSONB
- `interview_utterances` — interview_id, ts_ms, speaker, text, confidence, edited_by, edited_at
- `interview_facts` — interview_id, utterance_id, subject, predicate, value, evidence
- `interview_analyses` — interview_id, created_at, kind ('risk'|'contradiction'|'missing_evidence'|'score'|'follow_up'), payload JSONB
- `interview_notes` — interview_id, author_id, section, body (private manual assessment; only author + admin can read)
- `interview_reports` — interview_id, kind, body JSONB, generated_at
- `document_requests` — interview_id, doc_type, reason, status, requested_at
- `question_suggestions` — interview_id, stage, question, reason, used bool, produced_signal bool
- `kg_nodes` / `kg_edges` — typed graph seeded from facts

All tables: RLS on; `service_role` + `authenticated` grants; `authenticated` policies scope by interviewer_id or role (`has_role(auth.uid(),'admin')`). `interview_notes` policy restricts SELECT to author + admin.

## Server surface

- `POST /api/interviews/$id/transcribe-chunk` — TanStack server route, forwards WAV window to Lovable AI STT and streams SSE back
- `createServerFn` in `src/lib/interviews.functions.ts`:
  - `startInterview({ founderId })` → creates row + generates brief (Gemini)
  - `analyzeInterview({ interviewId, sinceUtteranceId })` → structured analysis
  - `commitUtterance({...})`, `editUtterance({...})`
  - `logNote({...})`, `logSuggestionOutcome({...})`
  - `finalizeInterview({ interviewId })` → memo suite bundle
  - `listInterviews()`, `getInterview(id)`
- All authenticated via `requireSupabaseAuth`; Gemini calls go through the shared `createLovableAiGatewayProvider` helper server-side.

## Frontend

New routes:
- `src/routes/_authenticated/interviews.index.tsx` — list + New
- `src/routes/_authenticated/interviews.$id.brief.tsx` — pre-interview brief
- `src/routes/_authenticated/interviews.$id.live.tsx` — multi-panel workspace
- `src/routes/_authenticated/interviews.$id.report.tsx` — memo suite + IC dashboard

Because interviews are auth-only now, we un-bypass auth for this subtree only: the rest of the app stays public per your earlier request. If you'd rather keep the whole app open, we'll drop the `_authenticated/` prefix and rely on RLS + a single interviewer identity.

New components under `src/components/interview/`: `HeaderStrip`, `StageRail`, `TranscriptStream`, `AnalysisRail` (with `RiskCard`, `ContradictionCard`, `MissingEvidence`, `ScoreDial`), `SuggestionCard`, `ManualNotes`, `DocRequestList`, `ICRecommendationCard`.

Design tokens: reuse the existing white/teal palette but override the interview module with a "terminal" variant — pure white surface, midnight-blue `#0B1F3A` for headings/rails, ultra-light grey dividers, teal reserved for AI-generated content chips so users can tell human vs. AI at a glance. Cormorant Garamond stays for headings; body switches to `Inter` in the interview workspace only, for dense tabular readability.

## Explicitly deferred (scaffolded, not built)

- Voice-stress / video behavioural / eye contact — panel exists with "Coming soon"
- Audio playback per paragraph — needs stored audio
- Automatic document parsing (bank statements, pitch deck scoring, website analysis) — panel exists, upload only
- Knowledge graph visualization — data captured, viz later
- PDF export of IC report — print CSS only for now

## Open questions

1. **Auth**: The interview module needs a signed-in user to attribute utterances, private notes, and IC recommendations. OK to enable auth on `/interviews/*` only (rest of app stays open), or should I keep everything public with a single "interviewer" identity?
2. **Mic permission on the preview**: Lovable's preview iframe blocks `getUserMedia` by default. For the live-recording demo you'll need to open the preview in its own tab. Flag or block?
