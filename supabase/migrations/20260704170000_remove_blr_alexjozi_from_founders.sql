-- Remove BLR and AlexJozi from founders table as they are organizations, not founders
DELETE FROM public.founders WHERE name IN ('BLR', 'AlexJozi');
