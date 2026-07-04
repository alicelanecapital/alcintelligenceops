-- Alice Lane Capital SME Platform Internal Operating Playbook — Deal
-- Structuring: Valuation Framework (§10), Structuring Principles (§11),
-- Use of Funds Framework (§12). Additive only.

alter table public.opportunities
  add column if not exists valuation_method text,
  add column if not exists valuation_amount numeric,
  add column if not exists valuation_notes text,
  add column if not exists proposed_instrument text,
  add column if not exists equity_stake_pct numeric,
  add column if not exists protective_rights jsonb default '{}'::jsonb,
  add column if not exists use_of_funds_allocations jsonb default '[]'::jsonb,
  add column if not exists use_of_funds_approval_notes text,
  add column if not exists staged_release jsonb default '[]'::jsonb;
