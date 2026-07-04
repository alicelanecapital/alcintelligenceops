-- Add Call Status and Source fields to contacts table
alter table public.contacts
  add column if not exists source text,  -- cold call, personal contact, ecosystem
  add column if not exists call_status text default 'Not Started',  -- Not Started, Scheduled, Call Back, Called, Opportunity
  add column if not exists last_call_date date,
  add column if not exists last_call_notes text,
  add column if not exists contact_type text;  -- for color coding badges
