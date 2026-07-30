-- Generalize the round/question/document designer beyond the single DD Intelligence
-- Engine toolkit. dd_framework_rounds gains a toolkit_id so any toolkit (e.g. a
-- custom "Pitch Playbook") can own its own set of rounds in the same shared table.
-- `round` stays a single globally-unique integer identifier across all toolkits --
-- dd_framework_questions/documents and dd_interviews already key off it directly,
-- so no changes needed there.

alter table public.dd_framework_rounds add column if not exists toolkit_id uuid references public.toolkits(id) on delete cascade;

-- Backfill: every round that exists today belongs to the one current due_diligence toolkit.
update public.dd_framework_rounds
set toolkit_id = (select id from public.toolkits where kind = 'due_diligence' order by created_at asc limit 1)
where toolkit_id is null;

create index if not exists dd_framework_rounds_toolkit_id_idx on public.dd_framework_rounds(toolkit_id);
