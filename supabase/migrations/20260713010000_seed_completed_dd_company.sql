-- Seed one fully-completed due-diligence example so the team can see the
-- 5-round process end-to-end (transcripts, responses, AI analysis, internal
-- verification, and meetings) without having to run a live interview first.
-- Wrapped in a guard on the opportunity name so re-running this migration is
-- a no-op if the demo company already exists.

do $seed$
declare
  v_founder_id uuid;
  v_company_id uuid;
  v_opportunity_id uuid;
  v_interview_id uuid;
  v_round int;
  v_round_title text;
begin
  if exists (select 1 from public.opportunities where name = 'Kaya Fresh Foods - Demo (Completed)') then
    return;
  end if;

  insert into public.founders (
    name, startup_name, sector, location, stage, revenue, employees, funding_sought,
    website, problem, solution, traction, referral_source, why_interesting,
    ai_investment_score, status, industry, email, phone,
    first_met_date, assigned_partner, relationship_strength
  ) values (
    'Thandiwe Nkosi', 'Kaya Fresh Foods', 'Food', 'Cape Town, South Africa', 'Growth',
    'R 8.4m annualised', 34, 'R 3.5m',
    'https://kayafreshfoods.example.com',
    'Independent grocers in townships struggle to source fresh, affordable produce with reliable delivery.',
    'A cold-chain distribution network that aggregates smallholder farms and delivers fresh produce directly to independent grocers 3x per week.',
    '34 employees, 212 retail customers, 3 distribution routes, revenue up 61% YoY.',
    'Endeavor South Africa introduction',
    'Proven unit economics, founder with 6 years operating history, clear expansion path to 2 more provinces.',
    82, 'Active', 'Food', 'thandiwe@kayafreshfoods.example.com', '+27 71 555 0142',
    (current_date - interval '9 months')::date, 'Nomsa Dlamini', 5
  ) returning id into v_founder_id;

  insert into public.companies (
    name, industry, province, country, city, founded_year, employees, revenue_band,
    investment_stage, status, relationship_owner, business_model, problem_solved,
    products, services, customers, website, summary
  ) values (
    'Kaya Fresh Foods (Pty) Ltd', 'Food', 'Western Cape', 'South Africa', 'Cape Town',
    2019, 34, 'R 5m - R 10m', 'Growth', 'Active', 'Nomsa Dlamini',
    'B2B cold-chain distribution, subscription-style delivery routes to independent grocers',
    'Unreliable, expensive fresh produce sourcing for township grocers',
    'Fresh fruit, vegetables and dairy', 'Cold-chain logistics and route delivery, 3x weekly',
    '212 independent grocers across Cape Town metro',
    'https://kayafreshfoods.example.com',
    'Cape Town-based cold-chain distributor connecting smallholder farms to independent township grocers. Completed all 5 rounds of Alice Lane due diligence with a clean recommendation.'
  ) returning id into v_company_id;

  update public.founders set current_company_id = v_company_id where id = v_founder_id;

  insert into public.founder_companies (founder_id, company_id, role, is_current)
  values (v_founder_id, v_company_id, 'Founder & CEO', true);

  -- External stakeholders so the pre-interview stakeholder brief has real people to summarise.
  insert into public.contacts (name, category, company, position, email, phone, notes, date_met)
  values
    ('Thandiwe Nkosi', 'founder', 'Kaya Fresh Foods', 'Founder & CEO', 'thandiwe@kayafreshfoods.example.com', '+27 71 555 0142', 'Primary founder contact, drove all 5 rounds of due diligence.', (current_date - interval '9 months')::date),
    ('Sipho Radebe', 'founder', 'Kaya Fresh Foods', 'Chief Financial Officer', 'sipho@kayafreshfoods.example.com', '+27 82 555 0198', 'Joined 18 months ago from a logistics background, owns the management accounts.', (current_date - interval '6 months')::date),
    ('Naledi Mokoena', 'ecosystem', 'Endeavor South Africa', 'Portfolio Manager', 'naledi@endeavor.example.com', '+27 83 555 0110', 'Referral source, sits in on major milestone meetings as an observer.', (current_date - interval '9 months')::date),
    ('Werner Botha', 'vendor', 'Botha & Associates Attorneys', 'Commercial Attorney', 'werner@bothalaw.example.com', '+27 21 555 0177', 'External legal counsel for Kaya Fresh Foods, handled the Round 3 legal document set.', (current_date - interval '4 months')::date)
  on conflict do nothing;

  insert into public.opportunities (
    name, founder_id, company_id, industry, current_stage, assigned_partner,
    priority, estimated_investment, probability, source, summary
  ) values (
    'Kaya Fresh Foods - Demo (Completed)', v_founder_id, v_company_id, 'Food',
    'Investment Committee', 'Nomsa Dlamini', 'High', 3500000, 85,
    'Endeavor South Africa introduction',
    'Reference example: completed all 5 rounds of the due diligence framework with a clean "Proceed" recommendation. Kept for training and process demonstration.'
  ) returning id into v_opportunity_id;

  -- One dd_interviews row per round, each completed, with a transcript, AI
  -- analysis payload (matching the shape DDInterviewEnhanced.tsx renders),
  -- and internal verification steps checked off.
  for v_round in 1..5 loop
    select title into v_round_title from public.dd_framework_rounds where round = v_round;

    insert into public.dd_interviews (
      opportunity_id, round, status, transcript, transcript_source,
      ai_analysis, detected_sector, sector_confidence, stakeholder_brief,
      created_at, started_at, completed_at
    ) values (
      v_opportunity_id, v_round, 'completed',
      'Interview transcript for round ' || v_round || ' (' || coalesce(v_round_title, 'Round ' || v_round) || '): Thandiwe Nkosi and Sipho Radebe walked through each question in detail, providing supporting documents and management account extracts. All claims were cross-checked against submitted documentation and an independent site visit.',
      'manual',
      jsonb_build_object(
        'redFlags', case when v_round = 3 then jsonb_build_array(jsonb_build_object('severity', 'PRICE_IT_IN', 'text', 'One retail lease renewal is on a month-to-month basis pending a new 3-year agreement.')) else '[]'::jsonb end,
        'followUpQuestions', jsonb_build_array('Confirm timeline for the new distribution route into the Eastern Cape.', 'Request 12-month cash flow forecast at next check-in.'),
        'voiceAnalysis', jsonb_build_object('confidenceLevel', 88, 'speakingPace', 'Measured', 'hesitationMarkers', 2, 'assessment', 'Founder answered directly with specific figures; low hesitation.')
      ),
      'C', 91.0,
      case when v_round = 1 then jsonb_build_object(
        'generated_at', now(),
        'attendees', jsonb_build_array(
          jsonb_build_object('name', 'Thandiwe Nkosi', 'role', 'Founder & CEO', 'org', 'Kaya Fresh Foods', 'notes', 'Primary decision-maker; owns 100% of the founder relationship history.'),
          jsonb_build_object('name', 'Sipho Radebe', 'role', 'Chief Financial Officer', 'org', 'Kaya Fresh Foods', 'notes', 'Recently joined; expect detailed command of management accounts, less on early company history.'),
          jsonb_build_object('name', 'Naledi Mokoena', 'role', 'Portfolio Manager (observing)', 'org', 'Endeavor South Africa', 'notes', 'Referral source sitting in as an observer; keep her looped in on next steps.')
        ),
        'talking_points', jsonb_build_array(
          'Open by acknowledging the Endeavor referral to build rapport.',
          'Confirm which of the two founders should field financial detail questions.',
          'Flag the month-to-month lease renewal risk for the CFO to address directly.'
        )
      ) else null end,
      now() - ((6 - v_round) * interval '3 weeks'),
      now() - ((6 - v_round) * interval '3 weeks'),
      now() - ((6 - v_round) * interval '3 weeks') + interval '2 hours'
    ) returning id into v_interview_id;

    insert into public.dd_round_responses (interview_id, question_number, question_text, founder_response, response_type, response_source)
    select
      v_interview_id,
      row_number() over (order by q.sort_order),
      q.question_text,
      'Confirmed in interview with supporting documentation; cross-checked against ' ||
        case v_round
          when 1 then 'the founder''s own account and initial site visit.'
          when 2 then 'management accounts and bank statements.'
          when 3 then 'signed contracts and the commercial attorney''s summary.'
          when 4 then 'operational site visit and staff interviews.'
          else 'reference calls with the founder''s prior investors and mentors.'
        end,
      'transcribed',
      'transcript'
    from public.dd_framework_questions q
    where q.round = v_round
    order by q.sort_order;

    insert into public.dd_internal_verification (interview_id, round, step_title, step_description, completed, completion_date, findings)
    select
      v_interview_id,
      v_round,
      coalesce(q.internal_steps[1], 'Verify response for question ' || q.sort_order),
      q.why_text,
      true,
      now() - ((6 - v_round) * interval '3 weeks') + interval '1 day',
      'Verified - no material discrepancy found.'
    from public.dd_framework_questions q
    where q.round = v_round
    order by q.sort_order
    limit 4;

    insert into public.meetings (
      founder_id, company_id, opportunity_id, title, meeting_date, location,
      attendees, agenda, transcript, summary, decisions, outcome
    ) values (
      v_founder_id, v_company_id, v_opportunity_id,
      'DD Round ' || v_round || ': ' || coalesce(v_round_title, 'Round ' || v_round),
      now() - ((6 - v_round) * interval '3 weeks'),
      'Alice Lane offices, Cape Town',
      jsonb_build_array(
        jsonb_build_object('name', 'Thandiwe Nkosi', 'org', 'Kaya Fresh Foods', 'external', true),
        jsonb_build_object('name', 'Sipho Radebe', 'org', 'Kaya Fresh Foods', 'external', true),
        jsonb_build_object('name', 'Nomsa Dlamini', 'org', 'Alice Lane Capital', 'external', false)
      ),
      'Work through round ' || v_round || ' of the due diligence framework.',
      'See dd_interviews.transcript for the full round transcript.',
      'Round ' || v_round || ' complete, no blocking red flags.',
      case when v_round = 3 then 'Month-to-month lease flagged to price in, not a blocker.' else 'Clear to proceed.' end,
      'Proceed to round ' || (v_round + 1)
    );
  end loop;

  update public.opportunities set current_stage = 'Investment Committee' where id = v_opportunity_id;
end $seed$;
