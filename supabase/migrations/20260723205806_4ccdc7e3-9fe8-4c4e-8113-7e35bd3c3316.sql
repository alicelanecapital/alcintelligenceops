
CREATE TABLE public.toolkits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'custom',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.toolkits TO authenticated;
GRANT ALL ON public.toolkits TO service_role;

ALTER TABLE public.toolkits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "toolkits team only" ON public.toolkits
FOR ALL TO authenticated
USING (private.is_team_member())
WITH CHECK (private.is_team_member());

CREATE TRIGGER toolkits_updated_at BEFORE UPDATE ON public.toolkits
FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

INSERT INTO public.toolkits (name, description, kind, sort_order)
VALUES ('DD Intelligence Engine',
        'Five-round due diligence framework guiding founder interviews from first meeting through investment committee.',
        'due_diligence', 0);
