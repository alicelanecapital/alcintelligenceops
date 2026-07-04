-- Add new columns to events table for enhanced event management
alter table public.events
  add column if not exists description text,  -- Strategic value and event overview
  add column if not exists who_you_meet text,  -- Key people/organizations to meet
  add column if not exists is_new boolean default false,  -- Flag for newly AI-discovered events
  add column if not exists attendee_email text;  -- Email for calendar sync (Gmail OAuth later)
