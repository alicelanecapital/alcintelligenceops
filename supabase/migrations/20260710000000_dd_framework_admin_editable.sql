-- Admin-editable DD Framework: rounds, questions, and required documents.
-- Seeded from src/lib/dd-framework-data.ts (previously hardcoded). The admin
-- screen at /admin/dd-framework manages these tables; DDInterviewEnhanced.tsx
-- and the round document checklist now read from here instead of the static
-- TypeScript export.

create table if not exists public.dd_framework_rounds (
  round integer primary key check (round between 1 and 5),
  title text not null,
  subtitle text,
  purpose text,
  duration text
);

create table if not exists public.dd_framework_questions (
  id uuid primary key default gen_random_uuid(),
  round integer not null references public.dd_framework_rounds(round) on delete cascade,
  sort_order integer not null default 0,
  question_text text not null,
  why_text text,
  internal_steps text[] default '{}',
  red_flags jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dd_framework_documents (
  id uuid primary key default gen_random_uuid(),
  round integer not null references public.dd_framework_rounds(round) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  purpose text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dd_framework_questions_round_idx on public.dd_framework_questions(round, sort_order);
create index if not exists dd_framework_documents_round_idx on public.dd_framework_documents(round, sort_order);

alter table public.dd_framework_rounds enable row level security;
create policy "dd_framework_rounds team only" on public.dd_framework_rounds
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

alter table public.dd_framework_questions enable row level security;
create policy "dd_framework_questions team only" on public.dd_framework_questions
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

alter table public.dd_framework_documents enable row level security;
create policy "dd_framework_documents team only" on public.dd_framework_documents
  for all to authenticated
  using ((auth.jwt() ->> 'email') like '%@alicelanecapital.com')
  with check ((auth.jwt() ->> 'email') like '%@alicelanecapital.com');

grant select, insert, update, delete on public.dd_framework_rounds to authenticated;
grant select, insert, update, delete on public.dd_framework_questions to authenticated;
grant select, insert, update, delete on public.dd_framework_documents to authenticated;

-- One-time seed. Uses "insert ... where not exists" guards on the child
-- tables so re-running this migration doesn't duplicate rows.
do $$
begin
  if not exists (select 1 from public.dd_framework_questions limit 1) then
    -- Auto-generated seed from src/lib/dd-framework-data.ts

    insert into public.dd_framework_rounds (round, title, subtitle, purpose, duration) values
      (1, 'Round 1: Sense Check', 'Is this worth our time?', 'Initial screening to filter obvious non-starters. Assess founder, market, and basic business health.', '30 minutes')
      on conflict (round) do update set title = excluded.title, subtitle = excluded.subtitle, purpose = excluded.purpose, duration = excluded.duration;

    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 1, 'Why are you raising capital now?', 'Timing reveals founder discipline and market readiness. Red flags: external pressure, vague rationale, recent pivots without clear triggers.', ARRAY['Verify timeline against industry trends', 'Check for forced vs. opportunistic raise'], '[{"text":"Running out of runway with no clear path to sustainability","severity":"WALK_AWAY"},{"text":"Multiple failed fundraising attempts without learning","severity":"PRICE_IT_IN"},{"text":"Raising opportunistically without product-market fit signals","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 2, 'What problem are you solving and for whom?', 'Core business clarity. Founders who can''t articulate this crisply often have unfocused products. Listen for specificity in customer type and pain point magnitude.', ARRAY['Validate problem exists via customer interviews', 'Check problem size justifies startup approach'], '[{"text":"Problem too vague or affects niche customer only","severity":"PRICE_IT_IN"},{"text":"Customer interviews show problem isn''t acute","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 3, 'How will you make money?', 'Business model clarity. Misalignment between GTM and unit economics is common. Listen for confidence in pricing and customer acquisition strategy.', ARRAY['Benchmark pricing vs. competitors', 'Model unit economics independently'], '[{"text":"No clear revenue model or pricing strategy","severity":"WALK_AWAY"},{"text":"Unit economics math doesn''t work at scale","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 4, 'What traction do you have?', 'De-risks the business. Traction (revenue, users, LOIs, pilot customers) is the strongest predictor of success. Listen for repeatability.', ARRAY['Verify all traction claims with evidence', 'Assess concentration risk in customers/revenue'], '[{"text":"No traction after 18+ months in market","severity":"WALK_AWAY"},{"text":"Traction is one-off or non-repeatable","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 5, 'Who is on your team and what''s missing?', 'Team assessment. Early-stage success depends more on founder quality than idea. Listen for self-awareness about gaps and hiring plans.', ARRAY['Verify founder backgrounds', 'Assess domain expertise and execution history'], '[{"text":"Founder has fraud or ethics history","severity":"WALK_AWAY"},{"text":"Team missing critical domain expertise","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 6, 'What are the top 3 risks to your business?', 'Self-awareness test. Founders who can articulate risks show maturity. Listen for mitigation strategies, not just risk acknowledgment.', ARRAY['Cross-reference stated risks with market knowledge', 'Assess mitigation strategies'], '[{"text":"Founder denies or minimizes obvious risks","severity":"WALK_AWAY"},{"text":"Risk mitigation plan is vague or unrealistic","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (1, 7, 'How much are you raising and what''s the use of funds?', 'Capital efficiency and runway. Overraising for stage or misallocated funds signals poor planning. Listen for specificity in allocation.', ARRAY['Verify runway calculation', 'Benchmark raise size against stage and geography'], '[{"text":"Raise too large for stage or milestones","severity":"PRICE_IT_IN"},{"text":"Vague use of funds allocation","severity":"MONITOR"}]'::jsonb);

    insert into public.dd_framework_rounds (round, title, subtitle, purpose, duration) values
      (2, 'Round 2: Financial Due Diligence', 'Does the business model actually work?', 'Deep dive into financial health, unit economics, and revenue model sustainability.', '60 minutes')
      on conflict (round) do update set title = excluded.title, subtitle = excluded.subtitle, purpose = excluded.purpose, duration = excluded.duration;

    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 1, 'Walk me through your revenue model and unit economics.', 'Core business viability. Founders should know CAC, LTV, payback period, and gross margin cold. Weak answers indicate lack of financial rigor.', ARRAY['Model unit economics independently', 'Stress test at 50% lower CAC assumption'], '[{"text":"Unit economics don''t work (LTV < 3x CAC)","severity":"WALK_AWAY"},{"text":"Founder can''t articulate basic metrics","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 2, 'How repeatable and scalable is your customer acquisition?', 'Repeatability is everything. One-off deals or channel-dependent acquisition can''t scale. Listen for multiple acquisition channels and predictable CAC.', ARRAY['Validate repeatable channels', 'Project revenue at different CAC scenarios'], '[{"text":"All revenue from 1-2 customers","severity":"WALK_AWAY"},{"text":"CAC increasing over time while LTV stagnates","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 3, 'What''s your gross margin trend and why?', 'Gross margin indicates product-market fit and cost structure. Declining gross margins suggest scaling issues or commodity competition.', ARRAY['Verify margin calculations', 'Benchmark vs. industry standards'], '[{"text":"Gross margins below 40% for SaaS","severity":"PRICE_IT_IN"},{"text":"Declining gross margins over time","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 4, 'What''s your customer acquisition cost and payback period?', 'Payback period determines cash burn and runway. Long payback periods (>12 months) require careful monitoring.', ARRAY['Calculate payback independently', 'Assess if payback aligns with fundraise use of funds'], '[{"text":"CAC payback > 24 months","severity":"PRICE_IT_IN"},{"text":"Increasing CAC with no clear efficiency gains","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 5, 'What''s your monthly burn rate and runway?', 'Survival metric. Every founder must know their exact burn and runway. Vague answers suggest poor financial management.', ARRAY['Verify burn calculation', 'Project runway with different growth scenarios'], '[{"text":"Runway under 12 months with no clear path to profitability","severity":"PRICE_IT_IN"},{"text":"Burn rate increasing without corresponding revenue increase","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 6, 'Have you ever been profitable or cash flow positive?', 'Profitability de-risks the investment. Even small instances of profitability show the business can work long-term.', ARRAY['Verify profitability claims', 'Understand path to sustained profitability'], '[{"text":"No plan to reach profitability","severity":"WALK_AWAY"},{"text":"One-time profitability achievement, not repeatable","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (2, 7, 'How confident are you in your financial projections and why?', 'Reality testing. Most founders are overly optimistic. Listen for conservatism in assumptions and data-driven rationale.', ARRAY['Compare projections to actuals', 'Assess historical forecast accuracy'], '[{"text":"Projections show hockey stick growth without basis","severity":"WALK_AWAY"},{"text":"Founder defensive about projections","severity":"PRICE_IT_IN"}]'::jsonb);

    insert into public.dd_framework_rounds (round, title, subtitle, purpose, duration) values
      (3, 'Round 3: Legal & Compliance', 'Are there hidden landmines?', 'Identify legal risks, IP issues, regulatory compliance gaps, and contractual obligations.', '60 minutes')
      on conflict (round) do update set title = excluded.title, subtitle = excluded.subtitle, purpose = excluded.purpose, duration = excluded.duration;

    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 1, 'What''s the complete cap table and are there any unusual terms?', 'Ownership and control assessment. Dilution, preference stacks, and control mechanisms affect future investment and exit.', ARRAY['Verify cap table against shareholder agreements', 'Assess preference liquidation scenarios'], '[{"text":"Founder owns <30% post-current round","severity":"PRICE_IT_IN"},{"text":"Complex preference stack with negative economics","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 2, 'Are there any outstanding litigation, claims, or IP disputes?', 'Hidden liabilities. Even small legal issues can consume management time and drain cash.', ARRAY['Verify no pending litigation', 'Check trademark/patent disputes'], '[{"text":"Active litigation or material pending claims","severity":"WALK_AWAY"},{"text":"IP disputes with larger competitors","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 3, 'Is all IP properly assigned to the company?', 'Core asset ownership. Unassigned IP can cloud ownership and create disputes with founders or employees.', ARRAY['Review IP assignment documents', 'Verify all employees signed IP agreements'], '[{"text":"Founder or key employee retains IP rights","severity":"WALK_AWAY"},{"text":"Missing IP assignments from early employees","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 4, 'What regulatory approvals or licenses are required?', 'Regulatory de-risking. Some industries require approvals that can take years or never materialize.', ARRAY['Verify all required licenses obtained', 'Assess regulatory approval timeline'], '[{"text":"Operating in regulated industry without proper licenses","severity":"WALK_AWAY"},{"text":"Regulatory approval path unclear or very long","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 5, 'Are there any material contracts that could impact valuation?', 'Revenue/cost concentration. Key customer contracts, supplier agreements, or lease terms can significantly impact valuation.', ARRAY['Review all material contracts', 'Assess change-of-control provisions'], '[{"text":"Major customer contract has termination rights post-investment","severity":"WALK_AWAY"},{"text":"Supplier contract with unfavorable terms","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 6, 'Do you have appropriate insurance coverage?', 'Risk mitigation. Underinsured companies can face catastrophic losses from ordinary events.', ARRAY['Verify appropriate insurance policies in place', 'Check coverage levels'], '[{"text":"No insurance or grossly underinsured","severity":"PRICE_IT_IN"},{"text":"Recent insurance claim denials","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (3, 7, 'Are there any material employment or contractor agreements we should know about?', 'Key person dependencies and cost obligations. Unvested equity, non-competes, and severance obligations matter.', ARRAY['Review employment contracts for key personnel', 'Assess non-compete enforceability'], '[{"text":"Key employee with enforceable non-compete to competitor","severity":"PRICE_IT_IN"},{"text":"Material unvested equity that could trigger retention issues","severity":"MONITOR"}]'::jsonb);

    insert into public.dd_framework_rounds (round, title, subtitle, purpose, duration) values
      (4, 'Round 4: Operational Due Diligence', 'Can they actually execute?', 'Assess operational capability, technology infrastructure, and execution risk.', '90 minutes')
      on conflict (round) do update set title = excluded.title, subtitle = excluded.subtitle, purpose = excluded.purpose, duration = excluded.duration;

    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 1, 'Walk me through your technology stack and key technical decisions.', 'Technical risk assessment. Outdated tech, poor architecture, or hero dependencies can cripple execution.', ARRAY['Have technical team review architecture', 'Assess technical debt and scalability'], '[{"text":"Heavy reliance on undocumented custom code","severity":"PRICE_IT_IN"},{"text":"Technology stack makes hiring extremely difficult","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 2, 'What is your customer support and retention strategy?', 'Customer health indicator. Poor support or declining retention signals product issues or market mismatch.', ARRAY['Review customer support tickets', 'Calculate customer lifetime value and churn'], '[{"text":"Churn rate >10% monthly for B2B, >5% for B2C","severity":"WALK_AWAY"},{"text":"No documented support process or SLAs","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 3, 'How do you measure product-market fit?', 'Confirms business viability. Founders with clear PMF metrics show discipline; lack of metrics suggests blindness.', ARRAY['Verify PMF metrics independently', 'Assess if metrics show sustainable growth'], '[{"text":"No clear product-market fit signals after 18+ months","severity":"WALK_AWAY"},{"text":"Metrics don''t correlate with revenue or retention","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 4, 'What''s your product development roadmap and how do you prioritize?', 'Execution strategy. Founders who can''t prioritize or articulate roadmap lack discipline.', ARRAY['Verify roadmap against customer feedback', 'Assess prioritization framework'], '[{"text":"No clear roadmap or prioritization framework","severity":"PRICE_IT_IN"},{"text":"Roadmap heavily influenced by random customer requests","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 5, 'What is your key person risk and succession plan?', 'Continuity assessment. Over-dependence on a single individual is a major risk.', ARRAY['Identify key person dependencies', 'Assess contingency planning'], '[{"text":"Business dependent on 1-2 individuals with no succession plan","severity":"WALK_AWAY"},{"text":"Key technical person threatening to leave","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 6, 'How do you manage quality and avoid product disasters?', 'Risk management. Quality processes indicate professionalism and reduce downtime risk.', ARRAY['Review testing and QA processes', 'Check incident history'], '[{"text":"Major outages or data loss incidents without learning","severity":"WALK_AWAY"},{"text":"No testing or code review process","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (4, 7, 'What are your biggest operational challenges right now?', 'Reality check. Founders honest about challenges show maturity; those who deny them lack self-awareness.', ARRAY['Verify stated challenges against operational metrics', 'Assess mitigation plans'], '[{"text":"Operational challenges that directly threaten survival","severity":"WALK_AWAY"},{"text":"Founder unaware of obvious operational issues","severity":"PRICE_IT_IN"}]'::jsonb);

    insert into public.dd_framework_rounds (round, title, subtitle, purpose, duration) values
      (5, 'Round 5: Founder & Deal Readiness', 'Is this founder and deal right for us?', 'Final assessment of founder quality, investment thesis alignment, and deal structure.', '60 minutes')
      on conflict (round) do update set title = excluded.title, subtitle = excluded.subtitle, purpose = excluded.purpose, duration = excluded.duration;

    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 1, 'What drives you as a founder and why this problem?', 'Motivation and resilience. Founders driven by mission are more likely to persevere through challenges.', ARRAY['Assess founder motivation authenticity', 'Verify personal connection to problem'], '[{"text":"Founder motivated primarily by getting rich quick","severity":"PRICE_IT_IN"},{"text":"Founder shows no personal connection to problem","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 2, 'How do you think about failure and what''s your backup plan?', 'Resilience test. Founders without backup plans are often less thoughtful about downside protection.', ARRAY['Assess founder resilience', 'Understand contingency planning'], '[{"text":"Founder unrealistic about failure scenarios","severity":"MONITOR"},{"text":"Founder refuses to discuss failure possibility","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 3, 'What would you do differently if you started over?', 'Learning orientation. Founders who can identify mistakes show growth mindset.', ARRAY['Assess self-reflection and learning capability', 'Verify past learning implementation'], '[{"text":"Founder blames others for all failures","severity":"WALK_AWAY"},{"text":"Founder makes same mistakes repeatedly","severity":"PRICE_IT_IN"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 4, 'How will you use this investment and why this amount at this time?', 'Capital allocation discipline. Misallocated funds signal poor planning.', ARRAY['Verify use of funds allocation', 'Stress test plan if growth slower than projected'], '[{"text":"Raise size not justified by milestones planned","severity":"PRICE_IT_IN"},{"text":"Significant portion allocated to discretionary spending","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 5, 'What are your expectations for board involvement and investor support?', 'Partnership alignment. Expectations misalignment creates friction.', ARRAY['Assess founder receptiveness to guidance', 'Clarify board structure and involvement'], '[{"text":"Founder doesn''t want investor input on strategy","severity":"PRICE_IT_IN"},{"text":"Founder has unrealistic expectations of investor support","severity":"MONITOR"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 6, 'How do you think the market will evolve and where do you want to be?', 'Vision and strategic thinking. Limited vision suggests lack of ambition or market understanding.', ARRAY['Verify market assumptions', 'Assess founder''s competitive strategy'], '[{"text":"No clear long-term vision or market understanding","severity":"PRICE_IT_IN"},{"text":"Vision doesn''t match market reality or competitive landscape","severity":"WALK_AWAY"}]'::jsonb);
    insert into public.dd_framework_questions (round, sort_order, question_text, why_text, internal_steps, red_flags) values
      (5, 7, 'What questions should I have asked but didn''t?', 'Final signal. Thoughtful founders often identify gaps in diligence or critical risks.', ARRAY['Listen for critical issues raised', 'Assess founder self-awareness'], '[{"text":"Founder has no additional topics to discuss","severity":"MONITOR"},{"text":"Founder raises critical issues only when prompted","severity":"PRICE_IT_IN"}]'::jsonb);

    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (1, 1, 'Cap table', 'Understand ownership structure and dilution');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (1, 2, 'Articles of incorporation', 'Verify legal structure and formation');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (1, 3, 'Financial summary', 'Quick overview of revenue and profitability');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 1, 'Audited financials', 'Verify revenue and expense accuracy');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 2, 'Bank statements', 'Confirm cash position and transaction history');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 3, 'Revenue breakdown', 'Understand customer concentration and pricing');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 4, 'Expense breakdown', 'Assess spending allocation and efficiency');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 5, 'Cash flow projection', 'Evaluate runway and fundraising needs');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 6, 'SAFEs/convertible notes', 'Understand future dilution obligations');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (2, 7, 'Historical P&L', 'Assess trend and trajectory');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 1, 'Term sheet', 'Understand previous investment terms');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 2, 'Shareholder agreements', 'Verify control and governance provisions');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 3, 'Employment contracts', 'Identify key person dependencies');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 4, 'IP assignment documents', 'Verify company owns all IP');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 5, 'Insurance policies', 'Assess risk coverage');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 6, 'Customer contracts', 'Identify revenue concentration and change-of-control risks');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 7, 'Regulatory approvals', 'Verify compliance and licenses');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (3, 8, 'Litigation history', 'Identify legal risks');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 1, 'Org chart', 'Understand team structure and gaps');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 2, 'Key employee contracts', 'Verify retention and compensation');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 3, 'Technology architecture', 'Assess technical risk');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 4, 'Customer support logs', 'Evaluate support quality and retention');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 5, 'Product roadmap', 'Understand execution plan');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 6, 'Facilities lease', 'Identify material obligations');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (4, 7, 'Vendor agreements', 'Understand key vendor relationships');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (5, 1, 'Market analysis', 'Verify market size and addressability');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (5, 2, 'Competitive landscape', 'Assess competitive positioning');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (5, 3, 'Investment memo', 'Document investment thesis');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (5, 4, 'Cap table (post-investment)', 'Confirm final ownership structure');
    insert into public.dd_framework_documents (round, sort_order, name, purpose) values
      (5, 5, 'Founder biography', 'Verify background and experience');
  end if;
end $$;
