-- Independent expert/consultant input on a DD round. These contributors are NOT
-- being assessed (no scoring, no DISC, no per-question founder responses) -- their
-- transcript is only used to check existing red flags (validate/refute), surface
-- new ones, and log questions we haven't asked yet.
create table if not exists public.dd_expert_reviews (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  consultant_name text,
  file_name text,
  transcript text not null,
  validations jsonb not null default '[]'::jsonb,
  new_flags jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dd_expert_reviews_interview on public.dd_expert_reviews(interview_id);

alter table public.dd_expert_reviews enable row level security;
drop policy if exists "dd_expert_reviews team only" on public.dd_expert_reviews;
create policy "dd_expert_reviews team only" on public.dd_expert_reviews
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

grant select, insert, update, delete on public.dd_expert_reviews to authenticated;
grant all on public.dd_expert_reviews to service_role;
