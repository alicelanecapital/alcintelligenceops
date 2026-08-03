-- Contact categories used to be a fixed hardcoded list (founder/investor/ecosystem/
-- vendor/unknown). contacts.category was always a free-text column with no FK, so
-- storing a custom value already worked -- this table just persists the list of known
-- categories so a custom one created from the dropdown is offered to everyone after.
create table if not exists public.contact_categories (
  value text primary key,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.contact_categories (value, label, sort_order) values
  ('founder', 'Founder', 0),
  ('investor', 'Investor', 1),
  ('ecosystem', 'Ecosystem', 2),
  ('vendor', 'Vendor', 3),
  ('unknown', 'Unknown', 4)
on conflict (value) do nothing;

alter table public.contact_categories enable row level security;
drop policy if exists "contact_categories open" on public.contact_categories;
create policy "contact_categories open" on public.contact_categories for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.contact_categories to authenticated;
grant all on public.contact_categories to service_role;
