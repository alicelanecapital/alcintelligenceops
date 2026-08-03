-- Seeds a lightweight "Ad Hoc Meeting" playbook: a custom toolkit with no configured
-- rounds, which playbook-questions.ts already renders as a single free-form "Meeting"
-- step. This becomes the default pick in Start Meeting instead of the 5-round DD
-- template, since most meetings aren't formal due-diligence rounds.
insert into public.toolkits (name, description, kind, sort_order)
select 'Ad Hoc Meeting', 'A free-form meeting with no fixed round structure.', 'custom', -1
where not exists (select 1 from public.toolkits where lower(name) = 'ad hoc meeting');
