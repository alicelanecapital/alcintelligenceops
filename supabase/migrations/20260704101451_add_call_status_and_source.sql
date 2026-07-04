-- Add Call Status and Source fields to founders and organisations

-- Add to founders table
alter table public.founders
  add column if not exists source text,  -- cold call, personal contact, ecosystem
  add column if not exists call_status text default 'Not Started',  -- Not Started, Scheduled, Call Back, Called, Opportunity
  add column if not exists last_call_date date,
  add column if not exists last_call_notes text;

-- Add to organisations table
alter table public.organisations
  add column if not exists call_status text default 'Not Started',  -- Not Started, Scheduled, Call Back, Called, Opportunity
  add column if not exists last_call_date date,
  add column if not exists last_call_notes text;

-- Add to events table for status colors
alter table public.events
  add column if not exists status_color text;  -- will be set based on status
