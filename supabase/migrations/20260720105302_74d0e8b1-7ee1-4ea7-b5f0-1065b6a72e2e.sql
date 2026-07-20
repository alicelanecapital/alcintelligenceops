ALTER TABLE public.dd_framework_rounds ADD COLUMN IF NOT EXISTS sort_order integer;
UPDATE public.dd_framework_rounds SET sort_order = round WHERE sort_order IS NULL;
ALTER TABLE public.dd_framework_rounds ALTER COLUMN sort_order SET NOT NULL;
ALTER TABLE public.dd_framework_rounds ALTER COLUMN sort_order SET DEFAULT 0;
CREATE INDEX IF NOT EXISTS dd_framework_rounds_sort_order_idx ON public.dd_framework_rounds(sort_order);