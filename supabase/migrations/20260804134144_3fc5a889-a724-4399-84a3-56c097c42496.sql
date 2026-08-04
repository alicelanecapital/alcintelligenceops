CREATE TABLE public.workspace_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  playbook_id uuid REFERENCES public.toolkits(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  step_key integer,
  step_title text,
  classification_confidence numeric,
  classification_reason text,
  file_name text NOT NULL,
  file_size_bytes integer,
  mime_type text,
  storage_path text,
  extracted_text text,
  drive_file_id text,
  drive_web_link text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workspace_documents_interview_idx ON public.workspace_documents(interview_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_documents TO authenticated;
GRANT ALL ON public.workspace_documents TO service_role;

ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members manage workspace documents"
  ON public.workspace_documents FOR ALL TO authenticated
  USING (private.is_team_member())
  WITH CHECK (private.is_team_member());

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS drive_folder_id text;