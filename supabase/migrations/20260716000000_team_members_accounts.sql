-- Team member roster for the Admin > Accounts screen: lets an admin register
-- teammates (and shared inboxes) by email and assign each a colour, used to
-- colour-code their synced calendar events on the Meetings screen -- independent
-- of whether that person has completed the Google OAuth connect flow yet.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  color text not null default 'blue',
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "team_members team" on public.team_members;
create policy "team_members team" on public.team_members
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

grant select, insert, update, delete on public.team_members to authenticated;

insert into public.team_members (email, display_name, color) values
  ('tendai@alicelanecapital.com', 'Tendai', 'red'),
  ('georgia@alicelanecapital.com', 'Georgia', 'green'),
  ('info@alicelanecapital.com', 'Info (shared inbox)', 'orange')
on conflict (email) do nothing;
