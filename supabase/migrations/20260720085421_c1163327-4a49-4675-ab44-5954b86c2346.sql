-- dd_interview_custom_questions
DROP POLICY IF EXISTS "dd_interview_custom_questions team only" ON public.dd_interview_custom_questions;
CREATE POLICY "dd_interview_custom_questions team only"
  ON public.dd_interview_custom_questions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (private.is_team_member())
  WITH CHECK (private.is_team_member());

-- dd_interview_extra_questions
DROP POLICY IF EXISTS "dd_interview_extra_questions team only" ON public.dd_interview_extra_questions;
CREATE POLICY "dd_interview_extra_questions team only"
  ON public.dd_interview_extra_questions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (private.is_team_member())
  WITH CHECK (private.is_team_member());

-- contact-photos storage policies
DROP POLICY IF EXISTS "contact_photos team write" ON storage.objects;
CREATE POLICY "contact_photos team write"
  ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contact-photos' AND private.is_team_member());

DROP POLICY IF EXISTS "contact_photos team update" ON storage.objects;
CREATE POLICY "contact_photos team update"
  ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contact-photos' AND private.is_team_member())
  WITH CHECK (bucket_id = 'contact-photos' AND private.is_team_member());

DROP POLICY IF EXISTS "contact_photos team delete" ON storage.objects;
CREATE POLICY "contact_photos team delete"
  ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (bucket_id = 'contact-photos' AND private.is_team_member());