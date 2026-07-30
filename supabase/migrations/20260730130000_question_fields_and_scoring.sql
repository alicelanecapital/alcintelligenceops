-- Playbook question designer: internal guideline + rephrased wording fields, plus a
-- simple per-question numeric score used for auto-scoring later (out of scope for now --
-- this migration just gives the designer somewhere to record it).

alter table public.dd_framework_questions add column if not exists internal_guideline text;
alter table public.dd_framework_questions add column if not exists rephrased_question text;
alter table public.dd_framework_questions add column if not exists score numeric;
