-- Alice Lane Capital SME Platform Internal Operating Playbook — 100-Day
-- Post-Investment Plan (§13). Additive only.

alter table public.opportunities
  add column if not exists hundred_day_plan jsonb default '[]'::jsonb,
  add column if not exists hundred_day_milestones jsonb default '[]'::jsonb,
  add column if not exists hundred_day_cash_plan numeric,
  add column if not exists hundred_day_approval_date text;
