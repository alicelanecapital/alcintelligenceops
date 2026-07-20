
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS stakeholder_brief jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_signature text;
