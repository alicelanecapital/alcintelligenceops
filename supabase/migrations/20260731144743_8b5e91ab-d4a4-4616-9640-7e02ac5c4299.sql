DROP POLICY IF EXISTS "report_templates team all" ON public.report_templates;
CREATE POLICY "report_templates team all" ON public.report_templates FOR ALL TO authenticated
  USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "report_template_sections team all" ON public.report_template_sections;
CREATE POLICY "report_template_sections team all" ON public.report_template_sections FOR ALL TO authenticated
  USING (private.is_team_member()) WITH CHECK (private.is_team_member());

DROP POLICY IF EXISTS "report_template_samples team all" ON storage.objects;
CREATE POLICY "report_template_samples team all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'report-template-samples' AND private.is_team_member())
  WITH CHECK (bucket_id = 'report-template-samples' AND private.is_team_member());