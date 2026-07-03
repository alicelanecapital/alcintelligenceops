
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authed" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Roles
create type public.app_role as enum ('admin','member');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "roles readable by authed" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- Handle new user: create profile, first user = admin, others = member
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  insert into public.profiles (id, email, display_name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Updated_at helper
create or replace function public.tg_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Organisations (SME or ecosystem)
create type public.org_kind as enum ('ecosystem','sme');
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind org_kind not null,
  category text,
  industry text,
  province text,
  country text default 'South Africa',
  city text,
  website text,
  logo_url text,
  purpose text,
  who_they_serve text,
  selection_criteria text,
  funding_available text,
  engagement_playbook text,
  relationship_strength int default 0,
  trust_score int default 0,
  strategic_importance int default 0,
  sme_quality int default 0,
  referral_potential int default 0,
  deals_generated int default 0,
  response_rate int default 0,
  ai_relationship_score numeric,
  fit_rating text,
  status text,
  last_contact_at timestamptz,
  next_action text,
  notes text,
  source text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organisations to authenticated;
grant all on public.organisations to service_role;
alter table public.organisations enable row level security;
create policy "orgs all authed" on public.organisations for all to authenticated using (true) with check (true);
create trigger orgs_updated before update on public.organisations for each row execute function public.tg_updated_at();

-- Contacts
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  linkedin text,
  role text,
  organisation_id uuid references public.organisations(id) on delete set null,
  notes text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contacts to authenticated;
grant all on public.contacts to service_role;
alter table public.contacts enable row level security;
create policy "contacts all authed" on public.contacts for all to authenticated using (true) with check (true);
create trigger contacts_updated before update on public.contacts for each row execute function public.tg_updated_at();

-- Founders
create table public.founders (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  organisation_id uuid references public.organisations(id) on delete set null,
  name text not null,
  photo_url text,
  linkedin text,
  startup_name text,
  sector text,
  location text,
  stage text,
  revenue text,
  employees int,
  funding_sought text,
  website text,
  pitch_deck_url text,
  problem text,
  solution text,
  traction text,
  referral_source text,
  why_interesting text,
  ai_investment_score numeric,
  internal_notes text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.founders to authenticated;
grant all on public.founders to service_role;
alter table public.founders enable row level security;
create policy "founders all authed" on public.founders for all to authenticated using (true) with check (true);
create trigger founders_updated before update on public.founders for each row execute function public.tg_updated_at();

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  venue text,
  city text,
  country text,
  cost text,
  cost_type text,
  website text,
  registration_link text,
  industry text[],
  expected_audience text,
  ai_score numeric,
  ai_summary text,
  ai_factors jsonb,
  source_url text,
  status text default 'interested',
  owner text,
  cover_image_url text,
  discovered_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "events all authed" on public.events for all to authenticated using (true) with check (true);
create trigger events_updated before update on public.events for each row execute function public.tg_updated_at();

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.event_attendees to authenticated;
grant all on public.event_attendees to service_role;
alter table public.event_attendees enable row level security;
create policy "attendees all authed" on public.event_attendees for all to authenticated using (true) with check (true);

-- Deals
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete set null,
  organisation_id uuid references public.organisations(id) on delete set null,
  title text not null,
  source text,
  referral_contact_id uuid references public.contacts(id) on delete set null,
  investment_size text,
  investment_stage text,
  priority text,
  ai_investment_score numeric,
  stage text not null default 'New Opportunity',
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.deals to authenticated;
grant all on public.deals to service_role;
alter table public.deals enable row level security;
create policy "deals all authed" on public.deals for all to authenticated using (true) with check (true);
create trigger deals_updated before update on public.deals for each row execute function public.tg_updated_at();

create table public.deal_activity (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  kind text not null,
  payload jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.deal_activity to authenticated;
grant all on public.deal_activity to service_role;
alter table public.deal_activity enable row level security;
create policy "activity all authed" on public.deal_activity for all to authenticated using (true) with check (true);

-- Daily briefings
create table public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  content jsonb not null,
  model text,
  generated_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);
grant select, insert, update, delete on public.daily_briefings to authenticated;
grant all on public.daily_briefings to service_role;
alter table public.daily_briefings enable row level security;
create policy "own briefings" on public.daily_briefings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
