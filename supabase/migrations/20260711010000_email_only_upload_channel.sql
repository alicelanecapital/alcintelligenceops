-- Multi-Channel Document Upload was originally planned with email, WhatsApp,
-- and portal channels (dd_upload_channels.channel_type). WhatsApp and portal
-- have been dropped from scope -- email only, going forward. Simplify the
-- table accordingly; no rows exist yet (Phase 2 was never implemented), so
-- this is a safe structural cleanup, not a data migration.

alter table public.dd_upload_channels drop constraint if exists dd_upload_channels_channel_type_check;

alter table public.dd_upload_channels
  drop column if exists whatsapp_number,
  drop column if exists whatsapp_group_link,
  drop column if exists portal_founder_email,
  drop column if exists portal_access_token,
  drop column if exists portal_created_at,
  drop column if exists portal_expires_at;

alter table public.dd_upload_channels alter column channel_type set default 'email';
alter table public.dd_upload_channels add constraint dd_upload_channels_channel_type_check check (channel_type = 'email');

-- One dedicated upload channel per opportunity (not per round -- documents
-- collected via email aren't necessarily tagged to a specific round when
-- they arrive; they get triaged into a round from the document checklist).
alter table public.dd_upload_channels drop constraint if exists dd_upload_channels_interview_id_fkey;
alter table public.dd_upload_channels alter column interview_id drop not null;
create unique index if not exists dd_upload_channels_opportunity_unique on public.dd_upload_channels(opportunity_id);

-- Narrow dd_interview_documents.upload_channel the same way (whatsapp/portal dropped).
alter table public.dd_interview_documents drop constraint if exists dd_interview_documents_upload_channel_check;
alter table public.dd_interview_documents add constraint dd_interview_documents_upload_channel_check check (upload_channel in ('email', 'manual'));

-- Per-team-member Google OAuth tokens, powering both the Calendar "Booked"
-- check and the Gmail-based email upload channel. Each user can only see
-- and manage their own connection.
create table if not exists public.google_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_connections enable row level security;
drop policy if exists "google_oauth_connections own row" on public.google_oauth_connections;
create policy "google_oauth_connections own row" on public.google_oauth_connections
  for all to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

grant select, insert, update, delete on public.google_oauth_connections to authenticated;

-- Storage bucket for documents ingested via the email upload channel.
-- Private: these are confidential due-diligence documents, not for public URLs.
insert into storage.buckets (id, name, public)
values ('dd-documents', 'dd-documents', false)
on conflict (id) do nothing;

drop policy if exists "dd_documents team all" on storage.objects;
create policy "dd_documents team all" on storage.objects
  for all to authenticated
  using (bucket_id = 'dd-documents' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check (bucket_id = 'dd-documents' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');
