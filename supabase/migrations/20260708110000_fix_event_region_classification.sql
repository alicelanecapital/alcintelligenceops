-- Reclassify already-created events whose city/country indicates South Africa
-- but were tagged region = 'Global' (the AI discovery step sometimes filed
-- SA-hosted conferences under the wrong list). One-time data correction;
-- event-discovery.functions.ts now re-derives region from location text
-- going forward so this shouldn't recur.

update public.events
set region = 'SA'
where region is distinct from 'SA'
  and (
    lower(coalesce(country, '')) like '%south africa%'
    or lower(coalesce(city, '')) like '%south africa%'
    or lower(coalesce(city, '')) like '%cape town%'
    or lower(coalesce(city, '')) like '%johannesburg%'
    or lower(coalesce(city, '')) like '%pretoria%'
    or lower(coalesce(city, '')) like '%durban%'
    or lower(coalesce(city, '')) like '%sandton%'
    or lower(coalesce(city, '')) like '%stellenbosch%'
    or lower(coalesce(city, '')) like '%bloemfontein%'
    or lower(coalesce(city, '')) like '%port elizabeth%'
    or lower(coalesce(city, '')) like '%gqeberha%'
    or lower(coalesce(city, '')) like '%east london%'
  );
