-- A free-text sector/industry field on the contact itself (e.g. "Hospitality", "Fintech"),
-- editable from the Edit Company and Contacts modal and AI-enrichable. Distinct from the
-- DD-round-detected sector code (A-F) used inside the due diligence framework.
alter table public.contacts add column if not exists sector text;
