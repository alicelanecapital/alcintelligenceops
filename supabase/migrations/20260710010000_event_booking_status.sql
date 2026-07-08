-- Interim event booking status, ahead of real Google Calendar integration.
-- Once Google OAuth is wired up, "booked" can be auto-derived from whether a
-- matching calendar event exists for the team member; for now it's a manual toggle.
alter table public.events
  add column if not exists booked boolean not null default false,
  add column if not exists booked_by text,
  add column if not exists booked_at timestamptz;
