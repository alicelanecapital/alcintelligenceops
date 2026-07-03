
-- Interview engine tables
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES public.founders(id) ON DELETE SET NULL,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title TEXT,
  founder_name TEXT,
  business_name TEXT,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|live|completed
  current_stage TEXT DEFAULT 'Founder',
  interviewer_name TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  brief JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO anon, authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interviews open" ON public.interviews FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_interviews_updated BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

CREATE TABLE public.interview_utterances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  ts_ms INTEGER NOT NULL,
  speaker TEXT NOT NULL DEFAULT 'Founder',
  text TEXT NOT NULL,
  confidence NUMERIC,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_utterances TO anon, authenticated;
GRANT ALL ON public.interview_utterances TO service_role;
ALTER TABLE public.interview_utterances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "utterances open" ON public.interview_utterances FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_utterances_interview ON public.interview_utterances(interview_id, ts_ms);

CREATE TABLE public.interview_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- risk | contradiction | missing_evidence | score | follow_up | fact
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_analyses TO anon, authenticated;
GRANT ALL ON public.interview_analyses TO service_role;
ALTER TABLE public.interview_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses open" ON public.interview_analyses FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_analyses_interview ON public.interview_analyses(interview_id, kind);

CREATE TABLE public.interview_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_notes TO anon, authenticated;
GRANT ALL ON public.interview_notes TO service_role;
ALTER TABLE public.interview_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes open" ON public.interview_notes FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.interview_notes FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

CREATE TABLE public.interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  body JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_reports TO anon, authenticated;
GRANT ALL ON public.interview_reports TO service_role;
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports open" ON public.interview_reports FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_requests TO anon, authenticated;
GRANT ALL ON public.document_requests TO service_role;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docreq open" ON public.document_requests FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.question_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  stage TEXT,
  question TEXT NOT NULL,
  reason TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  produced_signal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_suggestions TO anon, authenticated;
GRANT ALL ON public.question_suggestions TO service_role;
ALTER TABLE public.question_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qsug open" ON public.question_suggestions FOR ALL USING (true) WITH CHECK (true);
