
-- 1. Private schema for helper functions (not exposed by PostgREST)
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- 2. Move has_role into private with fixed search_path (SECURITY DEFINER retained to avoid RLS recursion)
create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke all on function private.has_role(uuid, public.app_role) from public;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- Helper: is signed-in user a team member (member or admin)?
create or replace function private.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin','member')
  )
$$;
revoke all on function private.is_team_member() from public;
grant execute on function private.is_team_member() to authenticated, service_role;

-- 3. Move handle_new_user into private and repoint the auth trigger
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_count int;
begin
  insert into public.profiles (id, email, display_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end
$$;
revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 4. Drop the public-schema copies (now unreferenced)
drop function if exists public.handle_new_user();
drop function if exists public.has_role(uuid, public.app_role);

-- 5. Fix mutable search_path on the updated_at trigger
create or replace function public.tg_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin new.updated_at = now(); return new; end
$$;

-- 6. Rewrite policies. Helper macro-style: every ALL policy uses team-member check for
--    both USING and WITH CHECK so the "always true" linter is satisfied and access
--    requires an assigned team role.

-- Tables previously exposed to the public role
do $$
declare
  t text;
  tables text[] := array[
    'interviews','interview_utterances','interview_notes','interview_analyses',
    'interview_reports','question_suggestions','document_requests'
  ];
  polname text;
begin
  foreach t in array tables loop
    for polname in
      select policyname from pg_policies where schemaname='public' and tablename=t
    loop
      execute format('drop policy if exists %I on public.%I', polname, t);
    end loop;
    execute format(
      'create policy "team members full access" on public.%I for all to authenticated using (private.is_team_member()) with check (private.is_team_member())',
      t
    );
  end loop;
end $$;

-- Business tables: keep team-member-only access, replace over-permissive policies
do $$
declare
  t text;
  tables text[] := array[
    'companies','organisations','deals','opportunities','investments','documents',
    'meetings','notes','communications','timeline_events','founder_intelligence',
    'relationship_signals','entity_merges','tasks','event_attendees','events',
    'founder_companies','deal_activity','contacts','founders'
  ];
  polname text;
begin
  foreach t in array tables loop
    for polname in
      select policyname from pg_policies where schemaname='public' and tablename=t
    loop
      execute format('drop policy if exists %I on public.%I', polname, t);
    end loop;
    execute format(
      'create policy "team members full access" on public.%I for all to authenticated using (private.is_team_member()) with check (private.is_team_member())',
      t
    );
  end loop;
end $$;

-- 7. Profiles: restrict SELECT to self or admin
drop policy if exists "profiles readable by authed" on public.profiles;
create policy "profiles self or admin read"
  on public.profiles for select to authenticated
  using (auth.uid() = id or private.has_role(auth.uid(), 'admin'));

-- 8. user_roles: restrict SELECT to self or admin
drop policy if exists "roles readable by authed" on public.user_roles;
create policy "user roles self or admin read"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id or private.has_role(auth.uid(), 'admin'));
