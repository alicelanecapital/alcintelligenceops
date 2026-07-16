-- Lets the interviewer add their own questions to a specific interview (this opportunity +
-- this round only) without touching the shared DD Framework template that every opportunity
-- uses. Distinct from dd_interview_extra_questions (AI/document-review follow-ups) -- these
-- are manually authored, meant to sit alongside the scripted questions in the interview itself.
create table if not exists public.dd_interview_custom_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  question_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_dd_interview_custom_questions_interview on public.dd_interview_custom_questions(interview_id);

alter table public.dd_interview_custom_questions enable row level security;
drop policy if exists "dd_interview_custom_questions team only" on public.dd_interview_custom_questions;
create policy "dd_interview_custom_questions team only" on public.dd_interview_custom_questions
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

grant select, insert, update, delete on public.dd_interview_custom_questions to authenticated;
grant all on public.dd_interview_custom_questions to service_role;
