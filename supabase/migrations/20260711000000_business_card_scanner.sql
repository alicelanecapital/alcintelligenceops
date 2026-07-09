-- Storage bucket for scanned business card photos (private -- team only).
insert into storage.buckets (id, name, public)
values ('business-cards', 'business-cards', false)
on conflict (id) do nothing;

drop policy if exists "business_cards team read" on storage.objects;
create policy "business_cards team read" on storage.objects
  for select to authenticated
  using (bucket_id = 'business-cards' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "business_cards team write" on storage.objects;
create policy "business_cards team write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-cards' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "business_cards team delete" on storage.objects;
create policy "business_cards team delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'business-cards' and (auth.jwt() ->> 'email') like '%@alicelanecapital.com');
