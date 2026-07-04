-- Add event scoring categories (10-point breakdown that auto-sums to 100)
alter table public.events
  add column if not exists score_cost int default 0,
  add column if not exists score_deal_flow int default 0,
  add column if not exists score_investor_access int default 0,
  add column if not exists score_strategic_partnerships int default 0,
  add column if not exists score_government_access int default 0,
  add column if not exists score_market_intelligence int default 0,
  add column if not exists score_industry_insights int default 0,
  add column if not exists score_brand_visibility int default 0,
  add column if not exists score_learning_development int default 0,
  add column if not exists score_long_term_opportunity int default 0,
  add column if not exists total_score int generated always as (
    score_cost + score_deal_flow + score_investor_access + score_strategic_partnerships +
    score_government_access + score_market_intelligence + score_industry_insights +
    score_brand_visibility + score_learning_development + score_long_term_opportunity
  ) stored;
