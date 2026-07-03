-- Alice Lane Capital SME Platform Internal Operating Playbook — SME Diagnostic
-- Framework (§8) and Due Diligence Checklist (§9). Additive only.

alter table public.opportunities
  add column if not exists diagnostic jsonb default '{}'::jsonb,
  add column if not exists diagnostic_score int,
  add column if not exists diagnostic_recommendation text,
  add column if not exists diagnostic_summary text,
  add column if not exists diligence_checklist jsonb default '{}'::jsonb,
  add column if not exists diligence_stop_points jsonb default '{}'::jsonb,
  add column if not exists diligence_output jsonb default '{}'::jsonb,
  add column if not exists diligence_recommendation text;
