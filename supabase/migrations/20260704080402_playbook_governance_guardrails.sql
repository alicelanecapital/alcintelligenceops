-- Alice Lane Capital SME Platform Internal Operating Playbook — Governance
-- & Guardrails (§14). Additive only.

alter table public.opportunities
  add column if not exists governance_board_seats int,
  add column if not exists governance_reporting_frequency text,
  add column if not exists governance_board_observer boolean,
  add column if not exists governance_founder_salary_cap numeric,
  add column if not exists governance_personal_expense_approval_threshold numeric,
  add column if not exists governance_spending_guardrails jsonb default '{}'::jsonb,
  add column if not exists governance_covenants jsonb default '[]'::jsonb,
  add column if not exists governance_approval_workflow text;
