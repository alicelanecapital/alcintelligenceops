-- Create table to store DD Engine workflow responses
CREATE TABLE IF NOT EXISTS public.dd_workflow_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  step integer NOT NULL,  -- 1=Screening, 2=Founder Assessment, 3=Diagnostic, 4=Due Diligence, 5=Decision
  step_name text NOT NULL,
  responses jsonb DEFAULT '{}'::jsonb,  -- Store all responses for the step
  transcripts jsonb DEFAULT '{}'::jsonb,  -- Store speech-to-text transcriptions
  documents jsonb DEFAULT '[]'::jsonb,  -- Store document uploads
  status text DEFAULT 'in_progress',  -- in_progress, paused, completed
  started_at timestamp DEFAULT now(),
  paused_at timestamp,
  resumed_at timestamp,
  completed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Add workflow_status to opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'not_started',  -- not_started, screening, assessment, diagnostic, diligence, decision, completed
  ADD COLUMN IF NOT EXISTS current_workflow_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workflow_paused_at timestamp;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dd_workflow_opportunity_id ON public.dd_workflow_responses(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_dd_workflow_status ON public.dd_workflow_responses(status);
