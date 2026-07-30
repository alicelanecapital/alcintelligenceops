-- A dedicated brand logo, separate from the general "sample attachment" reference file --
-- rendered directly on the assembled report's cover page.
alter table public.report_templates add column if not exists logo_url text;
