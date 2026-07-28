
DROP POLICY IF EXISTS "contact_photos_authed_select" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos_authed_insert" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos_authed_update" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos_authed_delete" ON storage.objects;

CREATE POLICY "contact_photos_authed_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contact-photos');

CREATE POLICY "contact_photos_authed_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contact-photos');

CREATE POLICY "contact_photos_authed_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contact-photos')
  WITH CHECK (bucket_id = 'contact-photos');

CREATE POLICY "contact_photos_authed_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contact-photos');
