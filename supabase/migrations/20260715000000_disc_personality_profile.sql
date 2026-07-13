-- Overall DISC personality profile (Dominance, Influence, Steadiness, Conscientiousness),
-- inferred from language and thought structure across all DD interview rounds run so far
-- for an opportunity. Regenerated on demand as more rounds complete.
alter table public.opportunities
  add column if not exists disc_profile jsonb;
