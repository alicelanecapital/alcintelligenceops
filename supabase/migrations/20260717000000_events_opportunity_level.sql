-- Rename the events "Status" concept to "Opportunity" (High/Medium/Low) in the UI.
-- Remap existing free-text status values onto the new three-value scale so
-- existing data displays sensibly once the UI only offers High/Medium/Low.
update public.events
set status = case status
  when 'priority' then 'High'
  when 'attend' then 'High'
  when 'opportunistic' then 'Medium'
  when 'selective' then 'Low'
  when 'High' then 'High'
  when 'Medium' then 'Medium'
  when 'Low' then 'Low'
  else 'Medium'
end
where status is distinct from case status
  when 'priority' then 'High'
  when 'attend' then 'High'
  when 'opportunistic' then 'Medium'
  when 'selective' then 'Low'
  when 'High' then 'High'
  when 'Medium' then 'Medium'
  when 'Low' then 'Low'
  else 'Medium'
end;
