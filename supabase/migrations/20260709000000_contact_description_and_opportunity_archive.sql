-- AI-generated company description on contacts (flows into opportunities.description
-- via createOpportunityFromContact, and is shown in the DD wizard's fixed company panel).
alter table public.contacts
  add column if not exists company_description text;

-- Allow archiving opportunities on the Due Diligence board without deleting them.
alter table public.opportunities
  add column if not exists archived boolean not null default false;

create index if not exists opportunities_archived_idx on public.opportunities(archived);
