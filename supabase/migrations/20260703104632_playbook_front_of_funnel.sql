-- Alice Lane Capital SME Platform Internal Operating Playbook — front-of-funnel fields.
-- Additive only: no existing columns changed, no rows touched.

-- Mess Taxonomy, Investment Criteria, and 7-Step Screening (Playbook §3, §4, §7)
alter table public.opportunities
  add column if not exists mess_classification text,
  add column if not exists mess_notes text,
  add column if not exists screening_step int default 0,
  add column if not exists screening_outcome text,
  add column if not exists screening_outcome_reason text,
  add column if not exists investment_criteria jsonb default '{}'::jsonb;

-- Founder Assessment: four core traits and archetype (Playbook §6)
alter table public.founders
  add column if not exists truthfulness_score int,
  add column if not exists commercial_instinct_score int,
  add column if not exists coachability_score int,
  add column if not exists owner_mentality_score int,
  add column if not exists founder_archetype text,
  add column if not exists assessment_notes text;
