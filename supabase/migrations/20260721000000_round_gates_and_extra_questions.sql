-- Round gates: allow a round to end in "hold" (don't proceed, with a required comment)
-- or "terminate" (kill the deal, with a required comment) instead of only ever advancing.
alter table public.dd_interviews drop constraint if exists dd_interviews_status_check;
alter table public.dd_interviews add constraint dd_interviews_status_check
  check (status in ('pending', 'in_progress', 'completed', 'paused', 'on_hold', 'terminated'));

alter table public.dd_interviews add column if not exists hold_notes text;
alter table public.dd_interviews add column if not exists hold_at timestamptz;
alter table public.dd_interviews add column if not exists terminated_notes text;
alter table public.dd_interviews add column if not exists terminated_at timestamptz;

-- Best-effort extracted text for a received document, used to ground the AI
-- anomaly-question generator when a document's content could be read (may be
-- null for documents we couldn't parse).
alter table public.dd_interview_documents add column if not exists extracted_text text;

-- AI-generated (and manually added) follow-up questions raised by reviewing this round's
-- received documents, evaluated before the session starts. Distinct from the admin-managed
-- dd_framework_questions since these are per-interview and fully user-editable (CRUD).
create table if not exists public.dd_interview_extra_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  question_text text not null,
  rationale text,
  sort_order integer not null default 0,
  source text not null default 'manual' check (source in ('manual', 'ai_document_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dd_interview_extra_questions_interview on public.dd_interview_extra_questions(interview_id);

alter table public.dd_interview_extra_questions enable row level security;
drop policy if exists "dd_interview_extra_questions team only" on public.dd_interview_extra_questions;
create policy "dd_interview_extra_questions team only" on public.dd_interview_extra_questions
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

grant select, insert, update, delete on public.dd_interview_extra_questions to authenticated;
grant all on public.dd_interview_extra_questions to service_role;
