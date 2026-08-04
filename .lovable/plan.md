# AI question grading in the Live Workspace

Each playbook question already carries a grading scorecard in the DD framework (`red_flags`: text + severity of `WALK_AWAY`, `PRICE_IT_IN`, `MONITOR`) — e.g. "Running out of runway". Today the Questions panel shows only the question, its "why", and the internal guideline. This adds two things:

1. An AI grade per question, derived from the live recording/transcript.
2. The grading scorecard shown under each question, with the AI marking which flags it can hear evidence for.

## What the panel will look like

- Question row (accordion header): question text plus a grade badge — `A`–`E` letter with a colour (forest green through amber to red), or "Not covered" when the transcript does not answer it yet.
- Expanded content, in order:
  - Why we ask / internal guideline (unchanged).
  - **AI grade**: letter + one-line rationale and the quoted transcript evidence it graded on.
  - **Grading scorecard**: the question's red flags, each with its severity chip and a status — `Detected` (evidence in transcript), `Clear`, or `Unknown`. Detected flags render in red, clear in green, unknown in grey.
- Panel header gets a "Grade answers" button showing the last graded time; grading also runs automatically after each transcript analysis pass so grades keep up with the recording.

## Grading scale

- `A` Strong, specific, evidenced answer
- `B` Adequate, minor gaps
- `C` Vague or partially answered
- `D` Evasive or contradicted elsewhere
- `E` Red flag territory
- `Not covered` — question not addressed in the transcript yet (never guessed)

## Technical notes

- New server function `gradeStepQuestions` in `src/lib/interview-grading.functions.ts` (`requireSupabaseAuth`), input `{ interviewId, stepKey }`. It loads the interview, its utterances, and the step's questions (with `red_flags`) and asks Lovable AI for strict JSON: per question `{ question_id, grade, rationale, evidence, flags: [{ text, status }] }`. Questions with no transcript coverage must come back as `Not covered` with empty evidence.
- Results persist to `interview_analyses` as `kind: "question_grade"` with `payload` keyed by `question_id` and `step_key`, so nothing new is needed in the schema and existing RLS applies. The newest row per question wins.
- `src/routes/interviews.$id.tsx` reads those rows from the already-loaded analyses list, maps them by question id, and renders the badge + scorecard inside the existing questions accordion. Grading is triggered from the new button and after `analyzeInterview` resolves.
- Scorecard flag chips reuse the existing severity/rating colour helpers so the styling matches Risk alerts.
- No changes to the recording, transcript, or DocBox flows.
