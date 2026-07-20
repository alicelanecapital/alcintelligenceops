ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attendees_count integer,
  ADD COLUMN IF NOT EXISTS total_cost numeric,
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;