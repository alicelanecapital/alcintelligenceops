
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS who_you_meet text;
