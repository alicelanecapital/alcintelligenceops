
-- Replace spoofable email-domain checks with verified role-based is_team_member()
DROP POLICY IF EXISTS "google_calendar_events team read" ON public.google_calendar_events;
CREATE POLICY "google_calendar_events team read" ON public.google_calendar_events
  FOR SELECT USING (private.is_team_member());

DROP POLICY IF EXISTS "dd_interviews team only" ON public.dd_interviews;
CREATE POLICY "dd_interviews team only" ON public.dd_interviews
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_round_responses team only" ON public.dd_round_responses;
CREATE POLICY "dd_round_responses team only" ON public.dd_round_responses
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_interview_documents team only" ON public.dd_interview_documents;
CREATE POLICY "dd_interview_documents team only" ON public.dd_interview_documents
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_verification_claims team only" ON public.dd_verification_claims;
CREATE POLICY "dd_verification_claims team only" ON public.dd_verification_claims
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_internal_verification team only" ON public.dd_internal_verification;
CREATE POLICY "dd_internal_verification team only" ON public.dd_internal_verification
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_upload_channels team only" ON public.dd_upload_channels;
CREATE POLICY "dd_upload_channels team only" ON public.dd_upload_channels
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_framework_rounds team only" ON public.dd_framework_rounds;
CREATE POLICY "dd_framework_rounds team only" ON public.dd_framework_rounds
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_framework_questions team only" ON public.dd_framework_questions;
CREATE POLICY "dd_framework_questions team only" ON public.dd_framework_questions
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "dd_framework_documents team only" ON public.dd_framework_documents;
CREATE POLICY "dd_framework_documents team only" ON public.dd_framework_documents
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "bookings team read" ON public.bookings;
CREATE POLICY "bookings team read" ON public.bookings
  FOR SELECT USING (private.is_team_member());

DROP POLICY IF EXISTS "team_members team" ON public.team_members;
CREATE POLICY "team_members team" ON public.team_members
  FOR ALL USING (private.is_team_member()) WITH CHECK (private.is_team_member());

-- Storage bucket policies
DROP POLICY IF EXISTS "business_cards team read" ON storage.objects;
CREATE POLICY "business_cards team read" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-cards' AND private.is_team_member());

DROP POLICY IF EXISTS "business_cards team write" ON storage.objects;
CREATE POLICY "business_cards team write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-cards' AND private.is_team_member());

DROP POLICY IF EXISTS "business_cards team delete" ON storage.objects;
CREATE POLICY "business_cards team delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'business-cards' AND private.is_team_member());

DROP POLICY IF EXISTS "dd_documents team all" ON storage.objects;
CREATE POLICY "dd_documents team all" ON storage.objects
  FOR ALL USING (bucket_id = 'dd-documents' AND private.is_team_member())
  WITH CHECK (bucket_id = 'dd-documents' AND private.is_team_member());
