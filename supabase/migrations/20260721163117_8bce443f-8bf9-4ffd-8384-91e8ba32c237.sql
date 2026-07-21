
DROP POLICY IF EXISTS "contact_photos team write" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos team update" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos team delete" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos team read" ON storage.objects;
DROP POLICY IF EXISTS "contact_photos public read" ON storage.objects;

CREATE POLICY "contact_photos team read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contact-photos' AND private.is_team_member());

CREATE POLICY "contact_photos team write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contact-photos' AND private.is_team_member());

CREATE POLICY "contact_photos team update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contact-photos' AND private.is_team_member())
  WITH CHECK (bucket_id = 'contact-photos' AND private.is_team_member());

CREATE POLICY "contact_photos team delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contact-photos' AND private.is_team_member());

CREATE POLICY "contact_photos public read"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'contact-photos');
