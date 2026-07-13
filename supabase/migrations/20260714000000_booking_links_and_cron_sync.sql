-- Booking links: each team member gets one shareable public URL (/book/{slug})
-- showing their real availability (synced calendar minus existing bookings),
-- letting clients self-book a session without any back-and-forth.

create table if not exists public.booking_links (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  slug text not null unique,
  title text not null default 'Book a session with Alice Lane',
  duration_minutes int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_link_id uuid not null references public.booking_links(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  client_notes text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  google_event_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bookings_link on public.bookings(booking_link_id);
create index if not exists idx_bookings_start on public.bookings(start_time);

alter table public.booking_links enable row level security;
drop policy if exists "booking_links own" on public.booking_links;
create policy "booking_links own" on public.booking_links
  for all to authenticated
  using (user_email = (auth.jwt() ->> 'email'))
  with check (user_email = (auth.jwt() ->> 'email'));
grant select, insert, update, delete on public.booking_links to authenticated;

alter table public.bookings enable row level security;
drop policy if exists "bookings team read" on public.bookings;
create policy "bookings team read" on public.bookings
  for select to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');
grant select on public.bookings to authenticated;
-- Deliberately no insert/update policy for authenticated or anon: every write to this
-- table goes through the createBooking server function using the service-role client,
-- so a public visitor on /book/{slug} can never read or forge another client's booking
-- directly against Postgres, and no anon RLS grant is needed on this or any other table.

-- Server-side sync every 15 minutes via pg_cron + pg_net, so calendars stay fresh
-- even when nobody has the app open (client-side polling in SyncGoogleButton.tsx
-- is a backstop for while someone does have it open).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $cron$
begin
  if exists (select 1 from cron.job where jobname = 'sync-google-calendars') then
    perform cron.unschedule('sync-google-calendars');
  end if;
end $cron$;

select cron.schedule(
  'sync-google-calendars',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://alcintelligenceops.lovable.app/api/cron/sync-google-calendars',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'a95ba0653f2fde97e38e132e9cf51eccc20ecb3d04107431'),
    body := '{}'::jsonb
  );
  $job$
);
