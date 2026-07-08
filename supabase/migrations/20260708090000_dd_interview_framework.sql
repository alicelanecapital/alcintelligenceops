-- Phase 1 DD Framework: interview tracking, documents, verification, sector detection

create table if not exists public.dd_interviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  round integer not null check (round >= 1 and round <= 5),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'paused')),
  recording_url text,
  recording_duration_seconds integer,
  transcript text,
  transcript_source text check (transcript_source in ('whisper', 'manual', 'none')),
  ai_analysis jsonb,
  detected_sector text check (detected_sector in ('A', 'B', 'C', 'D', 'E')),
  sector_confidence numeric(5,2),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz,
  unique(opportunity_id, round)
);

create table if not exists public.dd_round_responses (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  question_number integer not null,
  question_text text not null,
  founder_response text,
  response_type text default 'text' check (response_type in ('text', 'transcribed', 'uploaded')),
  response_source text check (response_source in ('transcript', 'manual_input', 'uploaded_document')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dd_interview_documents (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  round integer not null,
  document_category text not null,
  file_url text,
  file_name text,
  file_size_bytes integer,
  upload_channel text check (upload_channel in ('portal', 'email', 'whatsapp', 'manual')),
  document_type text,
  auto_analysis jsonb,
  verification_status text check (verification_status in ('received', 'reviewed', 'verified', 'flagged')),
  parsed_data jsonb,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.dd_verification_claims (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  claim_text text not null,
  claim_type text,
  round integer not null,
  founder_word boolean default false,
  documents_support boolean default false,
  independent_observation boolean default false,
  verification_complete boolean default false,
  verified_amount numeric,
  variance_percent numeric,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists public.dd_internal_verification (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  round integer not null,
  step_title text not null,
  step_description text,
  completed boolean default false,
  completion_date timestamptz,
  findings text,
  created_at timestamptz not null default now()
);

create table if not exists public.dd_upload_channels (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.dd_interviews(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  channel_type text not null check (channel_type in ('email', 'whatsapp', 'portal')),
  dedicated_email text,
  whatsapp_number text,
  whatsapp_group_link text,
  portal_founder_email text,
  portal_access_token text,
  portal_created_at timestamptz,
  portal_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_dd_interviews_opportunity on public.dd_interviews(opportunity_id);
create index if not exists idx_dd_interviews_round_status on public.dd_interviews(round, status);
create index if not exists idx_dd_round_responses_interview on public.dd_round_responses(interview_id);
create index if not exists idx_dd_interview_docs_interview on public.dd_interview_documents(interview_id);
create index if not exists idx_dd_verification_claims_interview on public.dd_verification_claims(interview_id);
create index if not exists idx_dd_internal_verification_interview on public.dd_internal_verification(interview_id);
create index if not exists idx_dd_upload_channels_opportunity on public.dd_upload_channels(opportunity_id);

alter table public.dd_interviews enable row level security;
create policy "dd_interviews open" on public.dd_interviews for all to authenticated using (true) with check (true);

alter table public.dd_round_responses enable row level security;
create policy "dd_round_responses open" on public.dd_round_responses for all to authenticated using (true) with check (true);

alter table public.dd_interview_documents enable row level security;
create policy "dd_interview_documents open" on public.dd_interview_documents for all to authenticated using (true) with check (true);

alter table public.dd_verification_claims enable row level security;
create policy "dd_verification_claims open" on public.dd_verification_claims for all to authenticated using (true) with check (true);

alter table public.dd_internal_verification enable row level security;
create policy "dd_internal_verification open" on public.dd_internal_verification for all to authenticated using (true) with check (true);

alter table public.dd_upload_channels enable row level security;
create policy "dd_upload_channels open" on public.dd_upload_channels for all to authenticated using (true) with check (true);

grant select, insert, update on public.dd_interviews to authenticated;
grant select, insert, update on public.dd_round_responses to authenticated;
grant select, insert, update on public.dd_interview_documents to authenticated;
grant select, insert, update on public.dd_verification_claims to authenticated;
grant select, insert, update on public.dd_internal_verification to authenticated;
grant select, insert, update on public.dd_upload_channels to authenticated;
