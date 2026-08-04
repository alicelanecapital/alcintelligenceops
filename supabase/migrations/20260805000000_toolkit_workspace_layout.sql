-- Which Live Workspace panels ("webparts") a playbook's meetings show, and in what
-- arrangement. Null/empty means "use the default layout" (every panel, same as today's
-- behaviour) -- so existing playbooks are unaffected until someone customises one from
-- the new Workspaces admin screen.
alter table public.toolkits add column if not exists workspace_layout jsonb;
