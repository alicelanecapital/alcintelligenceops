-- Link contacts to the shared companies entity so a company can show every
-- contact that works there (not just founders). The free-text contacts.company
-- field is kept for display/search continuity; company_id is the canonical link.
alter table public.contacts
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists contacts_company_id_idx on public.contacts (company_id);
