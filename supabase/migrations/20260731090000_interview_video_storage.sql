-- Private storage for uploaded interview videos (behavioral-signals analysis source).
-- Founder meeting recordings are confidential, so unlike report-template-samples this
-- bucket is NOT public -- playback goes through signed URLs, same pattern as contact-photos.
insert into storage.buckets (id, name, public)
values ('interview-videos', 'interview-videos', false)
on conflict (id) do nothing;

drop policy if exists "interview_videos team all" on storage.objects;
create policy "interview_videos team all" on storage.objects
  for all to authenticated
  using (bucket_id = 'interview-videos')
  with check (bucket_id = 'interview-videos');
