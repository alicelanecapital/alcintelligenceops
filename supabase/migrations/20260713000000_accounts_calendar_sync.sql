-- Admin > Accounts: per-user Google Calendar sync feeding "Upcoming meetings" on the Meetings screen.

alter table public.google_oauth_connections
  add column if not exists last_synced_at timestamptz;

create table if not exists public.google_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  google_event_id text not null,
  title text,
  description text,
  location text,
  meeting_link text,
  start_time timestamptz,
  end_time timestamptz,
  is_all_day boolean default false,
  attendees jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, google_event_id)
);

create index if not exists idx_google_calendar_events_start on public.google_calendar_events(start_time);
create index if not exists idx_google_calendar_events_user on public.google_calendar_events(user_email);

alter table public.google_calendar_events enable row level security;

-- Team-wide read so "Upcoming meetings" on the shared Meetings screen can show
-- everyone's synced calendar, matching this app's team-scoped-read pattern.
drop policy if exists "google_calendar_events team read" on public.google_calendar_events;
create policy "google_calendar_events team read" on public.google_calendar_events
  for select to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

-- Writes (sync) restricted to the owning user's own rows, same pattern as
-- google_oauth_connections -- a user's calendar sync should never let another
-- signed-in user overwrite it.
drop policy if exists "google_calendar_events own write" on public.google_calendar_events;
create policy "google_calendar_events own write" on public.google_calendar_events
  for all to authenticated
  using (user_email = (auth.jwt() ->> 'email'))
  with check (user_email = (auth.jwt() ->> 'email'));

grant select, insert, update, delete on public.google_calendar_events to authenticated;

-- Pre-interview stakeholder brief (AI-generated list of external Alice Lane
-- attendees + talking points), stored per round alongside the transcript/analysis.
alter table public.dd_interviews
  add column if not exists stakeholder_brief jsonb;
