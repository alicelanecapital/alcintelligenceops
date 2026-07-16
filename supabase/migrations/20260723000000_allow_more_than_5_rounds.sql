-- DD Framework Admin now supports adding/removing rounds (previously fixed at exactly 5).
-- Relax the round-count ceiling on both tables that hard-capped it at 5; keep the floor of 1.

alter table public.dd_framework_rounds drop constraint if exists dd_framework_rounds_round_check;
alter table public.dd_framework_rounds add constraint dd_framework_rounds_round_check check (round >= 1);

alter table public.dd_interviews drop constraint if exists dd_interviews_round_check;
alter table public.dd_interviews add constraint dd_interviews_round_check check (round >= 1);
