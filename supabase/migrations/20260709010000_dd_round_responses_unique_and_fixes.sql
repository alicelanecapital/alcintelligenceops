-- Fixes to support the DD interview save/progress flow:
-- Save Response upserts by (interview_id, question_number) so re-saving a
-- revised answer updates the existing row instead of erroring or duplicating.
-- Wrapped so it's safe to re-run (Postgres has no ADD CONSTRAINT IF NOT EXISTS).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dd_round_responses_interview_question_unique'
  ) then
    alter table public.dd_round_responses
      add constraint dd_round_responses_interview_question_unique unique (interview_id, question_number);
  end if;
end $$;
