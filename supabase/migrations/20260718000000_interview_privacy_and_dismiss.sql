-- Lets a meeting be marked private (kept out of the "Client meetings" column on the
-- Meetings screen) and dismissed (hidden from view without deleting the record).
alter table public.interviews
  add column if not exists is_private boolean not null default false,
  add column if not exists hidden boolean not null default false;
