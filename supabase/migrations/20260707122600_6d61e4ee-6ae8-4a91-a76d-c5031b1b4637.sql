
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ecosystem',
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS relationship_score int,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_met date,
  ADD COLUMN IF NOT EXISTS legacy_founder_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_org_id uuid;

CREATE INDEX IF NOT EXISTS contacts_category_idx ON public.contacts(category);
CREATE INDEX IF NOT EXISTS contacts_event_idx ON public.contacts(source_event_id);

-- Migrate organisations → contacts (skip already-migrated)
INSERT INTO public.contacts (name, category, company, website, notes, status, organisation_id, legacy_org_id, date_met, created_at)
SELECT
  o.name,
  CASE WHEN o.kind = 'sme' THEN 'vendor' ELSE 'ecosystem' END,
  o.name,
  o.website,
  o.notes,
  COALESCE(o.status, 'active'),
  o.id,
  o.id,
  o.created_at::date,
  o.created_at
FROM public.organisations o
WHERE NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.legacy_org_id = o.id);

-- Migrate founders → contacts (skip already-migrated)
INSERT INTO public.contacts (name, category, company, email, phone, linkedin, website, notes, ai_summary, organisation_id, legacy_founder_id, date_met, owner_id, created_at)
SELECT
  f.name,
  'founder',
  f.startup_name,
  f.email,
  f.phone,
  f.linkedin,
  f.website,
  f.internal_notes,
  f.why_interesting,
  f.organisation_id,
  f.id,
  COALESCE(f.first_met_date, f.created_at::date),
  f.owner_id,
  f.created_at
FROM public.founders f
WHERE NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.legacy_founder_id = f.id);

-- Add contact/event/meeting links to interviews and opportunities
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meeting_type text;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS interviews_contact_idx ON public.interviews(contact_id);
CREATE INDEX IF NOT EXISTS opportunities_contact_idx ON public.opportunities(contact_id);
