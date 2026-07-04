-- Add BLR and AlexJozi as ecosystem organizations
INSERT INTO public.organisations (name, category, purpose, who_they_serve, fit_rating, status)
VALUES
  ('Bolt & Raze (BLR)', 'Venture Capital / Investment Fund', 'Early-stage venture capital firm investing in African tech and innovation', 'Tech founders, startups, entrepreneurs', 'High', 'Active'),
  ('Alex Jozi', 'Accelerator / Hub', 'Johannesburg-based startup accelerator and innovation hub supporting early-stage African companies', 'African startups, entrepreneurs, SMEs', 'High', 'Active')
ON CONFLICT DO NOTHING;

-- Add contact information for BLR
INSERT INTO public.contacts (organisation_id, name, email, phone, role, source, call_status)
SELECT id, 'BLR Contact', 'contact@blr.co.za', '+27 (0)11 xxx xxxx', 'Investment Manager', 'ecosystem', 'Not Started'
FROM public.organisations
WHERE name = 'Bolt & Raze (BLR)'
ON CONFLICT DO NOTHING;

-- Add contact information for AlexJozi
INSERT INTO public.contacts (organisation_id, name, email, phone, role, source, call_status)
SELECT id, 'Alex Jozi Contact', 'contact@alexjozi.co.za', '+27 (0)11 xxx xxxx', 'Program Manager', 'ecosystem', 'Not Started'
FROM public.organisations
WHERE name = 'Alex Jozi'
ON CONFLICT DO NOTHING;
