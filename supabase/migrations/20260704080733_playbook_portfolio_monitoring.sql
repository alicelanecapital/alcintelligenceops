-- Alice Lane Capital SME Platform Internal Operating Playbook — Portfolio
-- Monitoring & Watchlist (§15). New tables for investment reviews and milestones.

create table if not exists public.investment_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null,
  review_date text,
  revenue_actual numeric,
  revenue_target numeric,
  margin_actual numeric,
  margin_target numeric,
  team_count int,
  founder_availability_hours numeric,
  health_score int,
  founder_behaviour_score int,
  red_flags jsonb default '[]'::jsonb,
  notes text,
  created_at timestamp default now()
);

create table if not exists public.investment_milestones (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null,
  milestone_text text,
  target_date text,
  target_value numeric,
  achieved boolean,
  achieved_date text,
  notes text,
  created_at timestamp default now()
);

create index if not exists idx_investment_reviews_opp on public.investment_reviews(opportunity_id);
create index if not exists idx_investment_milestones_opp on public.investment_milestones(opportunity_id);
