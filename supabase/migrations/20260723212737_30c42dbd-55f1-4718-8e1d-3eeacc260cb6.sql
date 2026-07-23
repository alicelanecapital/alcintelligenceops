ALTER TABLE public.google_calendar_events ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('done','cancelled','postponed'));
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('done','cancelled','postponed'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('done','cancelled','postponed'));