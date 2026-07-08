-- Tighten Phase 1 DD Framework RLS: restrict from "any authenticated user"
-- to "Alice Lane Capital team members only" (matched by email domain).
-- Flagged Critical by Lovable's security scanner after the initial migration:
-- any signed-in account (not just staff) could read/write due-diligence
-- documents, verification claims, interview transcripts, and — most
-- seriously — founder-portal upload access tokens.
-- Idempotent: drops both the original "open" policy name and this policy's
-- own name before creating, so it is safe to re-run.

drop policy if exists "dd_interviews open" on public.dd_interviews;
drop policy if exists "dd_interviews team only" on public.dd_interviews;
create policy "dd_interviews team only" on public.dd_interviews
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "dd_round_responses open" on public.dd_round_responses;
drop policy if exists "dd_round_responses team only" on public.dd_round_responses;
create policy "dd_round_responses team only" on public.dd_round_responses
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "dd_interview_documents open" on public.dd_interview_documents;
drop policy if exists "dd_interview_documents team only" on public.dd_interview_documents;
create policy "dd_interview_documents team only" on public.dd_interview_documents
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "dd_verification_claims open" on public.dd_verification_claims;
drop policy if exists "dd_verification_claims team only" on public.dd_verification_claims;
create policy "dd_verification_claims team only" on public.dd_verification_claims
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

drop policy if exists "dd_internal_verification open" on public.dd_internal_verification;
drop policy if exists "dd_internal_verification team only" on public.dd_internal_verification;
create policy "dd_internal_verification team only" on public.dd_internal_verification
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

-- dd_upload_channels holds portal_access_token (a bearer credential for the
-- Phase 2 founder upload portal) — the most sensitive table of the six.
-- Same team-only scoping; the token must never be broadly SELECT-able.
drop policy if exists "dd_upload_channels open" on public.dd_upload_channels;
drop policy if exists "dd_upload_channels team only" on public.dd_upload_channels;
create policy "dd_upload_channels team only" on public.dd_upload_channels
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');
