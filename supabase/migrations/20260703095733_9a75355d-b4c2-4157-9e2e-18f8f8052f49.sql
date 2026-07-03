
-- 1. EXTEND FOUNDERS
alter table public.founders
  add column if not exists biography text,
  add column if not exists education jsonb default '[]'::jsonb,
  add column if not exists experience jsonb default '[]'::jsonb,
  add column if not exists skills text[],
  add column if not exists achievements text,
  add column if not exists awards text,
  add column if not exists challenges text,
  add column if not exists opportunities_text text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists socials jsonb default '{}'::jsonb,
  add column if not exists first_met_date date,
  add column if not exists assigned_partner text,
  add column if not exists relationship_strength int,
  add column if not exists status text default 'Active',
  add column if not exists industry text,
  add column if not exists current_company_id uuid;

-- 2. COMPANIES
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  registration_number text,
  vat_number text,
  industry text,
  province text,
  country text default 'South Africa',
  city text,
  founded_year int,
  employees int,
  revenue_band text,
  investment_stage text,
  status text default 'Prospect',
  relationship_owner text,
  business_model text,
  problem_solved text,
  products text,
  services text,
  customers text,
  website text,
  linkedin text,
  address text,
  current_funding text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "companies open" on public.companies for all to authenticated using (true) with check (true);

create table if not exists public.founder_companies (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.founders(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text default 'Founder',
  is_current boolean default true,
  created_at timestamptz not null default now(),
  unique (founder_id, company_id)
);
grant select, insert, update, delete on public.founder_companies to authenticated;
grant all on public.founder_companies to service_role;
alter table public.founder_companies enable row level security;
create policy "fc open" on public.founder_companies for all to authenticated using (true) with check (true);

-- 3. OPPORTUNITIES
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  founder_id uuid references public.founders(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  industry text,
  current_stage text default 'New Opportunity',
  assigned_partner text,
  priority text default 'Medium',
  estimated_investment numeric,
  probability int,
  source text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.opportunities to authenticated;
grant all on public.opportunities to service_role;
alter table public.opportunities enable row level security;
create policy "opps open" on public.opportunities for all to authenticated using (true) with check (true);

-- 4. MEETINGS
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text,
  meeting_date timestamptz,
  location text,
  attendees jsonb default '[]'::jsonb,
  agenda text,
  transcript text,
  recording_url text,
  summary text,
  decisions text,
  action_items jsonb default '[]'::jsonb,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.meetings to authenticated;
grant all on public.meetings to service_role;
alter table public.meetings enable row level security;
create policy "meetings open" on public.meetings for all to authenticated using (true) with check (true);

-- 5. TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  assignee text,
  status text default 'Open',
  priority text default 'Medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "tasks open" on public.tasks for all to authenticated using (true) with check (true);

-- 6. NOTES
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  author text,
  body text not null,
  tags text[],
  mentions jsonb default '[]'::jsonb,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;
create policy "notes open" on public.notes for all to authenticated using (true) with check (true);

-- 7. DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  doc_type text,
  title text,
  storage_path text,
  file_name text,
  file_size int,
  mime_type text,
  tags text[],
  ai_summary text,
  version int default 1,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "documents open" on public.documents for all to authenticated using (true) with check (true);

-- 8. COMMUNICATIONS
create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade,
  kind text,
  direction text,
  subject text,
  body text,
  occurred_at timestamptz default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.communications to authenticated;
grant all on public.communications to service_role;
alter table public.communications enable row level security;
create policy "comms open" on public.communications for all to authenticated using (true) with check (true);

-- 9. TIMELINE EVENTS
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  event_type text not null,
  title text,
  body text,
  actor text,
  source_type text,
  source_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists timeline_events_founder_idx on public.timeline_events (founder_id, occurred_at desc);
grant select, insert, update, delete on public.timeline_events to authenticated;
grant all on public.timeline_events to service_role;
alter table public.timeline_events enable row level security;
create policy "timeline open" on public.timeline_events for all to authenticated using (true) with check (true);

-- 10. INVESTMENTS
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  amount numeric,
  instrument text,
  invested_at date,
  valuation numeric,
  status text default 'Committed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.investments to authenticated;
grant all on public.investments to service_role;
alter table public.investments enable row level security;
create policy "investments open" on public.investments for all to authenticated using (true) with check (true);

-- 11. FOUNDER INTELLIGENCE (AI panel cache)
create table if not exists public.founder_intelligence (
  founder_id uuid primary key references public.founders(id) on delete cascade,
  snapshot text,
  recent_developments jsonb default '[]'::jsonb,
  relationship_health jsonb default '{}'::jsonb,
  open_commitments jsonb default '[]'::jsonb,
  knowledge_gaps jsonb default '[]'::jsonb,
  next_best_actions jsonb default '[]'::jsonb,
  source_hash text,
  generated_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.founder_intelligence to authenticated;
grant all on public.founder_intelligence to service_role;
alter table public.founder_intelligence enable row level security;
create policy "intel open" on public.founder_intelligence for all to authenticated using (true) with check (true);

-- 12. RELATIONSHIP SIGNALS
create table if not exists public.relationship_signals (
  founder_id uuid primary key references public.founders(id) on delete cascade,
  last_contact_at timestamptz,
  days_since_last int,
  interactions_90d int default 0,
  strength_score int,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.relationship_signals to authenticated;
grant all on public.relationship_signals to service_role;
alter table public.relationship_signals enable row level security;
create policy "sig open" on public.relationship_signals for all to authenticated using (true) with check (true);

-- 13. ENTITY MERGES (duplicate detection queue)
create table if not exists public.entity_merges (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  candidate_ids uuid[] not null,
  score numeric,
  reason text,
  status text default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.entity_merges to authenticated;
grant all on public.entity_merges to service_role;
alter table public.entity_merges enable row level security;
create policy "merges open" on public.entity_merges for all to authenticated using (true) with check (true);

-- 14. updated_at triggers
do $$
declare t text;
begin
  for t in select unnest(array['companies','opportunities','meetings','tasks','notes','documents','investments','founder_intelligence','relationship_signals']) loop
    execute format('drop trigger if exists tg_%1$s_updated on public.%1$s;', t);
    execute format('create trigger tg_%1$s_updated before update on public.%1$s for each row execute function public.tg_updated_at();', t);
  end loop;
end $$;
