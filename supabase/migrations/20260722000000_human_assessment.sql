-- Captures the human evaluator's own written assessment during Internal Verification, so the
-- AI Analysis step can show a "Comparison to Human Assessment" alongside the AI's own findings.
alter table public.dd_interviews add column if not exists human_assessment text;
