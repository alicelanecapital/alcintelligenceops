-- Fictitious IC memo for 67CEOs Foundation NPC, for previewing the board-report Templates
-- layout end-to-end. Content is entirely made up for demo purposes -- delete this row before
-- any real board use.

update public.interviews
set status = 'completed', ended_at = now()
where id = '724663ba-5854-497d-9f97-d23b092f8154';

insert into public.interview_reports (interview_id, body)
values (
  '724663ba-5854-497d-9f97-d23b092f8154',
  '{
    "executive_summary": "67CEOs Foundation NPC operates a peer-learning and investment-readiness programme for South African SME founders, pairing each cohort member with an experienced CEO mentor over a 12-month cycle. Across six rounds of diligence, the Foundation demonstrated a credible operating model, a loyal mentor network, and early signs of measurable graduate outcomes, offset by thin financial reporting and a funding base concentrated in two corporate sponsors.",
    "founder_summary": "The Foundation is led by an executive director with a strong non-profit governance background and a part-time programme lead who runs day-to-day mentor matching. Both are mission-driven and well regarded in the SME ecosystem, but neither has run a for-profit P&L before, and the team is thin relative to its growth ambitions.",
    "business_summary": "The core offering is a structured 12-month mentorship programme (currently 3 cohorts, ~90 founders total) funded via corporate CSI budgets and a small facilitation fee charged to participating SMEs. Revenue is grant-based rather than earned, which caps scalability but is typical and acceptable for an ecosystem-support organisation of this kind.",
    "mess_classification": {
      "level": "Amber Mess",
      "reason": "Genuine social impact and a defensible niche, but revenue concentration and thin financial controls create real continuity risk if a single sponsor exits.",
      "evidence": "Two corporate sponsors account for roughly 70% of annual funding; no independently audited financials were available at Round 3.",
      "next_step": "Request the last two years of audited financials and a sponsor-renewal timeline before Round 5."
    },
    "investment_readiness": {
      "overall_score": 61,
      "confidence": { "score": 64, "why": "Leadership was consistent and credible across all six rounds; claims were generally corroborated by mentor testimonials." },
      "evidence_completeness": { "score": 48, "why": "No audited financials supplied; graduate outcome data is self-reported rather than independently verified." },
      "founder_readiness": { "score": 66, "why": "Strong programme design and stakeholder management skills; limited commercial/financial management experience." },
      "operational_maturity": { "score": 55, "why": "Mentor-matching process is well documented; back-office finance and reporting are manual and under-resourced." },
      "financial_visibility": { "score": 42, "why": "Budget was provided verbally and in a single spreadsheet; no management accounts or cash-flow forecast reviewed." },
      "growth_readiness": { "score": 70, "why": "Waitlist of both mentors and SME applicants suggests real demand headroom for a fourth cohort." }
    },
    "recommendation": {
      "verdict": "Proceed with Conditions",
      "why": "The programme addresses a real gap in SME support with a credible, low-cost model and strong founder-mentor fit; funding sits below the risk threshold for an unconditional recommendation.",
      "conditions": [
        "Independently reviewed financials for FY2024 and FY2025",
        "Written renewal commitments from both anchor corporate sponsors covering at least 18 months",
        "A basic management accounts process in place before the next disbursement"
      ]
    },
    "strengths": [
      "Clear, differentiated niche (structured CEO-to-founder mentorship, not generic advisory)",
      "High mentor and participant satisfaction scores across all three cohorts",
      "Founder credibility and strong relationships across the SME ecosystem",
      "Low fixed-cost base relative to programme reach"
    ],
    "weaknesses": [
      "Revenue concentrated in two corporate sponsors",
      "No audited financial statements",
      "Thin back-office capacity (finance, reporting, compliance)",
      "Impact data is self-reported, not independently verified"
    ],
    "value_creation_opportunities": [
      "Diversify funding to 4-5 mid-sized sponsors to reduce concentration risk",
      "Introduce a lightweight outcomes-tracking tool to independently verify graduate progress",
      "Formalise a finance function, even part-time, ahead of scaling to a fourth cohort"
    ],
    "return_pathways": [
      "Sustained grant funding renewal tied to demonstrated outcomes",
      "Potential fee-for-service model with larger corporates seeking supplier-development programmes"
    ],
    "risk_assessment": [
      { "category": "Funding concentration", "rating": "Amber", "reason": "Two sponsors represent ~70% of annual funding.", "mitigation": "Diversify to 4-5 sponsors over 18 months; secure written multi-year commitments." },
      { "category": "Financial controls", "rating": "Amber", "reason": "No audited financials or management accounts process in place.", "mitigation": "Fund a part-time bookkeeper and require quarterly management accounts as a condition of disbursement." },
      { "category": "Impact measurement", "rating": "Monitor", "reason": "Graduate outcome claims are self-reported by the Foundation, not independently verified.", "mitigation": "Introduce a simple third-party outcomes survey for each graduating cohort." },
      { "category": "Key-person dependency", "rating": "Monitor", "reason": "Executive director is the primary relationship-holder for both major sponsors.", "mitigation": "Document sponsor relationships and cross-train the programme lead as a secondary contact." }
    ],
    "outstanding_questions": [
      "What is the renewal timeline and confidence level for each of the two anchor sponsors?",
      "Has the Foundation modelled a scenario where one anchor sponsor exits?",
      "What independent evidence exists for reported graduate business outcomes?"
    ],
    "evidence_required": [
      "Audited or independently reviewed financial statements, FY2024-FY2025",
      "Signed sponsor agreements or renewal letters",
      "Any third-party impact evaluation, if one exists"
    ],
    "recommended_next_steps": [
      "Request outstanding financial and sponsor documentation",
      "Introduce the Foundation to two additional potential corporate sponsors from the Alice Lane network",
      "Schedule a follow-up review once FY2025 financials are available"
    ],
    "hundred_day_plan": [
      { "day_range": "Day 1-30", "workstream": "Financial controls", "outcome": "Part-time bookkeeper engaged; first management accounts produced" },
      { "day_range": "Day 31-60", "workstream": "Sponsor diversification", "outcome": "Two new prospective sponsors introduced and in active conversation" },
      { "day_range": "Day 61-100", "workstream": "Impact verification", "outcome": "Third-party outcomes survey run on the most recently graduated cohort" }
    ],
    "suggested_deal_structure": "Milestone-based grant facility, released in three tranches tied to the conditions above rather than a single upfront disbursement.",
    "equity_range": "Not applicable — non-profit grant structure, no equity.",
    "suggested_specialists": [
      "Non-profit financial governance advisor",
      "M&E (monitoring & evaluation) specialist for impact verification"
    ],
    "priority_workstreams": [
      "Financial controls and reporting",
      "Sponsor base diversification",
      "Independent impact verification"
    ]
  }'::jsonb
);
