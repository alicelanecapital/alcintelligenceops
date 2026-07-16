-- Profile photo per contact, shown in the Deal Pipeline so it's easier to remember who's who.
-- Public bucket (unlike business-cards/dd-documents) since a profile photo isn't confidential
-- and needs to render as a plain <img src> across many list views without minting signed URLs.
alter table public.contacts add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('contact-photos', 'contact-photos', true)
on conflict (id) do nothing;

drop policy if exists "contact_photos team write" on storage.objects;
create policy "contact_photos team write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contact-photos' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "contact_photos team update" on storage.objects;
create policy "contact_photos team update" on storage.objects
  for update to authenticated
  using (bucket_id = 'contact-photos' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "contact_photos team delete" on storage.objects;
create policy "contact_photos team delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contact-photos' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');
