-- Alice Lane Capital SME Platform Internal Operating Playbook — Value
-- Creation (§16) and Returns/Exit Scenarios (§17). Additive only.

alter table public.opportunities
  add column if not exists current_valuation numeric,
  add column if not exists valuation_history jsonb default '[]'::jsonb,
  add column if not exists value_creation_initiatives jsonb default '[]'::jsonb,
  add column if not exists exit_scenario text,
  add column if not exists exit_multiple numeric,
  add column if not exists projected_irr numeric,
  add column if not exists realized_exit_date text,
  add column if not exists realized_exit_amount numeric,
  add column if not exists realized_irr numeric,
  add column if not exists realized_multiple numeric;
