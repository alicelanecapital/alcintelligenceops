-- Auto-generated running AI overview of an opportunity, synthesised from company/founder
-- details, the DISC profile, and every round's transcript/analysis gathered so far.
-- Shown in the compact fixed summary strip at the top of the DD Interview screen.
alter table public.opportunities
  add column if not exists ai_overview jsonb;
