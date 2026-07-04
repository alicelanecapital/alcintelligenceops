-- Add website and description columns to contacts table
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS description text;
