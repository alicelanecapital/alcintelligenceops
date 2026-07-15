-- Track which of the user's Google calendars each synced event came from --
-- the sync previously only read the "primary" calendar, missing events on any
-- other calendar the user has in their own Google Calendar (work calendars,
-- auto-generated "Flights" calendar from Gmail, shared calendars, etc.).
alter table public.google_calendar_events
  add column if not exists calendar_id text,
  add column if not exists calendar_name text;
