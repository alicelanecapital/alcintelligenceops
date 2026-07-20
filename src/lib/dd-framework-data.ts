// DD Framework Data - Complete 5-Round Due Diligence Framework
// Alice Lane Capital - SME Platform

export const ROUND_1 = {
  title: 'Round 1: Sense Check',
  subtitle: 'Is this worth our time?',
  purpose: 'Initial screening to filter obvious non-starters. Assess founder, market, and basic business health.',
  duration: '30 minutes',
  questions: [
    {
      number: 1,
      question: 'Why are you raising capital now?',
      why: 'Timing reveals founder discipline and market readiness. Red flags: external pressure, vague rationale, recent pivots without clear triggers.',
      internalSteps: ['Verify timeline against industry trends', 'Check for forced vs. opportunistic raise'],
      redFlags: [
        { text: 'Running out of runway with no clear path to sustainability', severity: 'WALK_AWAY' },
        { text: 'Multiple failed fundraising attempts without learning', severity: 'PRICE_IT_IN' },
        { text: 'Raising opportunistically without product-market fit signals', severity: 'MONITOR' }
      ]
    },
    {
      number: 2,
      question: 'What problem are you solving and for whom?',
      why: 'Core business clarity. Founders who can\'t articulate this crisply often have unfocused products. Listen for specificity in customer type and pain point magnitude.',
      internalSteps: ['Validate problem exists via customer interviews', 'Check problem size justifies startup approach'],
      redFlags: [
        { text: 'Problem too vague or affects niche customer only', severity: 'PRICE_IT_IN' },
        { text: 'Customer interviews show problem isn\'t acute', severity: 'MONITOR' }
      ]
    },
    {
      number: 3,
      question: 'How will you make money?',
      why: 'Business model clarity. Misalignment between GTM and unit economics is common. Listen for confidence in pricing and customer acquisition strategy.',
      internalSteps: ['Benchmark pricing vs. competitors', 'Model unit economics independently'],
      redFlags: [
        { text: 'No clear revenue model or pricing strategy', severity: 'WALK_AWAY' },
        { text: 'Unit economics math doesn\'t work at scale', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 4,
      question: 'What traction do you have?',
      why: 'De-risks the business. Traction (revenue, users, LOIs, pilot customers) is the strongest predictor of success. Listen for repeatability.',
      internalSteps: ['Verify all traction claims with evidence', 'Assess concentration risk in customers/revenue'],
      redFlags: [
        { text: 'No traction after 18+ months in market', severity: 'WALK_AWAY' },
        { text: 'Traction is one-off or non-repeatable', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 5,
      question: 'Who is on your team and what\'s missing?',
      why: 'Team assessment. Early-stage success depends more on founder quality than idea. Listen for self-awareness about gaps and hiring plans.',
      internalSteps: ['Verify founder backgrounds', 'Assess domain expertise and execution history'],
      redFlags: [
        { text: 'Founder has fraud or ethics history', severity: 'WALK_AWAY' },
        { text: 'Team missing critical domain expertise', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 6,
      question: 'What are the top 3 risks to your business?',
      why: 'Self-awareness test. Founders who can articulate risks show maturity. Listen for mitigation strategies, not just risk acknowledgment.',
      internalSteps: ['Cross-reference stated risks with market knowledge', 'Assess mitigation strategies'],
      redFlags: [
        { text: 'Founder denies or minimizes obvious risks', severity: 'WALK_AWAY' },
        { text: 'Risk mitigation plan is vague or unrealistic', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 7,
      question: 'How much are you raising and what\'s the use of funds?',
      why: 'Capital efficiency and runway. Overraising for stage or misallocated funds signals poor planning. Listen for specificity in allocation.',
      internalSteps: ['Verify runway calculation', 'Benchmark raise size against stage and geography'],
      redFlags: [
        { text: 'Raise too large for stage or milestones', severity: 'PRICE_IT_IN' },
        { text: 'Vague use of funds allocation', severity: 'MONITOR' }
      ]
    }
  ]
};

export const ROUND_2 = {
  title: 'Round 2: Financial Due Diligence',
  subtitle: 'Does the business model actually work?',
  purpose: 'Deep dive into financial health, unit economics, and revenue model sustainability.',
  duration: '60 minutes',
  requiredDocuments: ['Audited financials', 'Bank statements', 'Revenue breakdown', 'Expense breakdown', 'Cash flow projection', 'Cap table', 'SAFEs/convertible notes', 'Historical P&L', 'Customer contracts'],
  questions: [
    {
      number: 1,
      question: 'Walk me through your revenue model and unit economics.',
      why: 'Core business viability. Founders should know CAC, LTV, payback period, and gross margin cold. Weak answers indicate lack of financial rigor.',
      internalSteps: ['Model unit economics independently', 'Stress test at 50% lower CAC assumption'],
      redFlags: [
        { text: 'Unit economics don\'t work (LTV < 3x CAC)', severity: 'WALK_AWAY' },
        { text: 'Founder can\'t articulate basic metrics', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 2,
      question: 'How repeatable and scalable is your customer acquisition?',
      why: 'Repeatability is everything. One-off deals or channel-dependent acquisition can\'t scale. Listen for multiple acquisition channels and predictable CAC.',
      internalSteps: ['Validate repeatable channels', 'Project revenue at different CAC scenarios'],
      redFlags: [
        { text: 'All revenue from 1-2 customers', severity: 'WALK_AWAY' },
        { text: 'CAC increasing over time while LTV stagnates', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 3,
      question: 'What\'s your gross margin trend and why?',
      why: 'Gross margin indicates product-market fit and cost structure. Declining gross margins suggest scaling issues or commodity competition.',
      internalSteps: ['Verify margin calculations', 'Benchmark vs. industry standards'],
      redFlags: [
        { text: 'Gross margins below 40% for SaaS', severity: 'PRICE_IT_IN' },
        { text: 'Declining gross margins over time', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 4,
      question: 'What\'s your customer acquisition cost and payback period?',
      why: 'Payback period determines cash burn and runway. Long payback periods (>12 months) require careful monitoring.',
      internalSteps: ['Calculate payback independently', 'Assess if payback aligns with fundraise use of funds'],
      redFlags: [
        { text: 'CAC payback > 24 months', severity: 'PRICE_IT_IN' },
        { text: 'Increasing CAC with no clear efficiency gains', severity: 'MONITOR' }
      ]
    },
    {
      number: 5,
      question: 'What\'s your monthly burn rate and runway?',
      why: 'Survival metric. Every founder must know their exact burn and runway. Vague answers suggest poor financial management.',
      internalSteps: ['Verify burn calculation', 'Project runway with different growth scenarios'],
      redFlags: [
        { text: 'Runway under 12 months with no clear path to profitability', severity: 'PRICE_IT_IN' },
        { text: 'Burn rate increasing without corresponding revenue increase', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 6,
      question: 'Have you ever been profitable or cash flow positive?',
      why: 'Profitability de-risks the investment. Even small instances of profitability show the business can work long-term.',
      internalSteps: ['Verify profitability claims', 'Understand path to sustained profitability'],
      redFlags: [
        { text: 'No plan to reach profitability', severity: 'WALK_AWAY' },
        { text: 'One-time profitability achievement, not repeatable', severity: 'MONITOR' }
      ]
    },
    {
      number: 7,
      question: 'How confident are you in your financial projections and why?',
      why: 'Reality testing. Most founders are overly optimistic. Listen for conservatism in assumptions and data-driven rationale.',
      internalSteps: ['Compare projections to actuals', 'Assess historical forecast accuracy'],
      redFlags: [
        { text: 'Projections show hockey stick growth without basis', severity: 'WALK_AWAY' },
        { text: 'Founder defensive about projections', severity: 'PRICE_IT_IN' }
      ]
    }
  ]
};

export const ROUND_3 = {
  title: 'Round 3: Legal & Compliance',
  subtitle: 'Are there hidden landmines?',
  purpose: 'Identify legal risks, IP issues, regulatory compliance gaps, and contractual obligations.',
  duration: '60 minutes',
  requiredDocuments: ['Articles of incorporation', 'Term sheet', 'Shareholder agreements', 'Employment contracts', 'IP assignment documents', 'Insurance policies', 'Customer contracts', 'Regulatory approvals', 'Litigation history'],
  questions: [
    {
      number: 1,
      question: 'What\'s the complete cap table and are there any unusual terms?',
      why: 'Ownership and control assessment. Dilution, preference stacks, and control mechanisms affect future investment and exit.',
      internalSteps: ['Verify cap table against shareholder agreements', 'Assess preference liquidation scenarios'],
      redFlags: [
        { text: 'Founder owns <30% post-current round', severity: 'PRICE_IT_IN' },
        { text: 'Complex preference stack with negative economics', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 2,
      question: 'Are there any outstanding litigation, claims, or IP disputes?',
      why: 'Hidden liabilities. Even small legal issues can consume management time and drain cash.',
      internalSteps: ['Verify no pending litigation', 'Check trademark/patent disputes'],
      redFlags: [
        { text: 'Active litigation or material pending claims', severity: 'WALK_AWAY' },
        { text: 'IP disputes with larger competitors', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 3,
      question: 'Is all IP properly assigned to the company?',
      why: 'Core asset ownership. Unassigned IP can cloud ownership and create disputes with founders or employees.',
      internalSteps: ['Review IP assignment documents', 'Verify all employees signed IP agreements'],
      redFlags: [
        { text: 'Founder or key employee retains IP rights', severity: 'WALK_AWAY' },
        { text: 'Missing IP assignments from early employees', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 4,
      question: 'What regulatory approvals or licenses are required?',
      why: 'Regulatory de-risking. Some industries require approvals that can take years or never materialize.',
      internalSteps: ['Verify all required licenses obtained', 'Assess regulatory approval timeline'],
      redFlags: [
        { text: 'Operating in regulated industry without proper licenses', severity: 'WALK_AWAY' },
        { text: 'Regulatory approval path unclear or very long', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 5,
      question: 'Are there any material contracts that could impact valuation?',
      why: 'Revenue/cost concentration. Key customer contracts, supplier agreements, or lease terms can significantly impact valuation.',
      internalSteps: ['Review all material contracts', 'Assess change-of-control provisions'],
      redFlags: [
        { text: 'Major customer contract has termination rights post-investment', severity: 'WALK_AWAY' },
        { text: 'Supplier contract with unfavorable terms', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 6,
      question: 'Do you have appropriate insurance coverage?',
      why: 'Risk mitigation. Underinsured companies can face catastrophic losses from ordinary events.',
      internalSteps: ['Verify appropriate insurance policies in place', 'Check coverage levels'],
      redFlags: [
        { text: 'No insurance or grossly underinsured', severity: 'PRICE_IT_IN' },
        { text: 'Recent insurance claim denials', severity: 'MONITOR' }
      ]
    },
    {
      number: 7,
      question: 'Are there any material employment or contractor agreements we should know about?',
      why: 'Key person dependencies and cost obligations. Unvested equity, non-competes, and severance obligations matter.',
      internalSteps: ['Review employment contracts for key personnel', 'Assess non-compete enforceability'],
      redFlags: [
        { text: 'Key employee with enforceable non-compete to competitor', severity: 'PRICE_IT_IN' },
        { text: 'Material unvested equity that could trigger retention issues', severity: 'MONITOR' }
      ]
    }
  ]
};

export const ROUND_4 = {
  title: 'Round 4: Operational Due Diligence',
  subtitle: 'Can they actually execute?',
  purpose: 'Assess operational capability, technology infrastructure, and execution risk.',
  duration: '90 minutes',
  requiredDocuments: ['Org chart', 'Key employee contracts', 'Technology architecture diagram', 'Customer support logs', 'Product roadmap', 'Facilities lease', 'Vendor agreements', 'Board minutes', 'Compliance certifications'],
  questions: [
    {
      number: 1,
      question: 'Walk me through your technology stack and key technical decisions.',
      why: 'Technical risk assessment. Outdated tech, poor architecture, or hero dependencies can cripple execution.',
      internalSteps: ['Have technical team review architecture', 'Assess technical debt and scalability'],
      redFlags: [
        { text: 'Heavy reliance on undocumented custom code', severity: 'PRICE_IT_IN' },
        { text: 'Technology stack makes hiring extremely difficult', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 2,
      question: 'What is your customer support and retention strategy?',
      why: 'Customer health indicator. Poor support or declining retention signals product issues or market mismatch.',
      internalSteps: ['Review customer support tickets', 'Calculate customer lifetime value and churn'],
      redFlags: [
        { text: 'Churn rate >10% monthly for B2B, >5% for B2C', severity: 'WALK_AWAY' },
        { text: 'No documented support process or SLAs', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 3,
      question: 'How do you measure product-market fit?',
      why: 'Confirms business viability. Founders with clear PMF metrics show discipline; lack of metrics suggests blindness.',
      internalSteps: ['Verify PMF metrics independently', 'Assess if metrics show sustainable growth'],
      redFlags: [
        { text: 'No clear product-market fit signals after 18+ months', severity: 'WALK_AWAY' },
        { text: 'Metrics don\'t correlate with revenue or retention', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 4,
      question: 'What\'s your product development roadmap and how do you prioritize?',
      why: 'Execution strategy. Founders who can\'t prioritize or articulate roadmap lack discipline.',
      internalSteps: ['Verify roadmap against customer feedback', 'Assess prioritization framework'],
      redFlags: [
        { text: 'No clear roadmap or prioritization framework', severity: 'PRICE_IT_IN' },
        { text: 'Roadmap heavily influenced by random customer requests', severity: 'MONITOR' }
      ]
    },
    {
      number: 5,
      question: 'What is your key person risk and succession plan?',
      why: 'Continuity assessment. Over-dependence on a single individual is a major risk.',
      internalSteps: ['Identify key person dependencies', 'Assess contingency planning'],
      redFlags: [
        { text: 'Business dependent on 1-2 individuals with no succession plan', severity: 'WALK_AWAY' },
        { text: 'Key technical person threatening to leave', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 6,
      question: 'How do you manage quality and avoid product disasters?',
      why: 'Risk management. Quality processes indicate professionalism and reduce downtime risk.',
      internalSteps: ['Review testing and QA processes', 'Check incident history'],
      redFlags: [
        { text: 'Major outages or data loss incidents without learning', severity: 'WALK_AWAY' },
        { text: 'No testing or code review process', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 7,
      question: 'What are your biggest operational challenges right now?',
      why: 'Reality check. Founders honest about challenges show maturity; those who deny them lack self-awareness.',
      internalSteps: ['Verify stated challenges against operational metrics', 'Assess mitigation plans'],
      redFlags: [
        { text: 'Operational challenges that directly threaten survival', severity: 'WALK_AWAY' },
        { text: 'Founder unaware of obvious operational issues', severity: 'PRICE_IT_IN' }
      ]
    }
  ]
};

export const ROUND_5 = {
  title: 'Round 5: Founder & Deal Readiness',
  subtitle: 'Is this founder and deal right for us?',
  purpose: 'Final assessment of founder quality, investment thesis alignment, and deal structure.',
  duration: '60 minutes',
  requiredDocuments: ['Personal financial statement', 'Background check results', 'Market analysis', 'Competitive landscape', 'Investment memo', 'Term sheet', 'Cap table (post-investment)', 'Use of funds allocation', 'Founder biography'],
  questions: [
    {
      number: 1,
      question: 'What drives you as a founder and why this problem?',
      why: 'Motivation and resilience. Founders driven by mission are more likely to persevere through challenges.',
      internalSteps: ['Assess founder motivation authenticity', 'Verify personal connection to problem'],
      redFlags: [
        { text: 'Founder motivated primarily by getting rich quick', severity: 'PRICE_IT_IN' },
        { text: 'Founder shows no personal connection to problem', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 2,
      question: 'How do you think about failure and what\'s your backup plan?',
      why: 'Resilience test. Founders without backup plans are often less thoughtful about downside protection.',
      internalSteps: ['Assess founder resilience', 'Understand contingency planning'],
      redFlags: [
        { text: 'Founder unrealistic about failure scenarios', severity: 'MONITOR' },
        { text: 'Founder refuses to discuss failure possibility', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 3,
      question: 'What would you do differently if you started over?',
      why: 'Learning orientation. Founders who can identify mistakes show growth mindset.',
      internalSteps: ['Assess self-reflection and learning capability', 'Verify past learning implementation'],
      redFlags: [
        { text: 'Founder blames others for all failures', severity: 'WALK_AWAY' },
        { text: 'Founder makes same mistakes repeatedly', severity: 'PRICE_IT_IN' }
      ]
    },
    {
      number: 4,
      question: 'How will you use this investment and why this amount at this time?',
      why: 'Capital allocation discipline. Misallocated funds signal poor planning.',
      internalSteps: ['Verify use of funds allocation', 'Stress test plan if growth slower than projected'],
      redFlags: [
        { text: 'Raise size not justified by milestones planned', severity: 'PRICE_IT_IN' },
        { text: 'Significant portion allocated to discretionary spending', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 5,
      question: 'What are your expectations for board involvement and investor support?',
      why: 'Partnership alignment. Expectations misalignment creates friction.',
      internalSteps: ['Assess founder receptiveness to guidance', 'Clarify board structure and involvement'],
      redFlags: [
        { text: 'Founder doesn\'t want investor input on strategy', severity: 'PRICE_IT_IN' },
        { text: 'Founder has unrealistic expectations of investor support', severity: 'MONITOR' }
      ]
    },
    {
      number: 6,
      question: 'How do you think the market will evolve and where do you want to be?',
      why: 'Vision and strategic thinking. Limited vision suggests lack of ambition or market understanding.',
      internalSteps: ['Verify market assumptions', 'Assess founder\'s competitive strategy'],
      redFlags: [
        { text: 'No clear long-term vision or market understanding', severity: 'PRICE_IT_IN' },
        { text: 'Vision doesn\'t match market reality or competitive landscape', severity: 'WALK_AWAY' }
      ]
    },
    {
      number: 7,
      question: 'What questions should I have asked but didn\'t?',
      why: 'Final signal. Thoughtful founders often identify gaps in diligence or critical risks.',
      internalSteps: ['Listen for critical issues raised', 'Assess founder self-awareness'],
      redFlags: [
        { text: 'Founder has no additional topics to discuss', severity: 'MONITOR' },
        { text: 'Founder raises critical issues only when prompted', severity: 'PRICE_IT_IN' }
      ]
    }
  ]
};

export const MASTER_DOCUMENT_CHECKLIST = [
  // Round 1 Documents
  { round: 1, name: 'Cap table', purpose: 'Understand ownership structure and dilution' },
  { round: 1, name: 'Articles of incorporation', purpose: 'Verify legal structure and formation' },
  { round: 1, name: 'Financial summary', purpose: 'Quick overview of revenue and profitability' },

  // Round 2 Documents
  { round: 2, name: 'Audited financials', purpose: 'Verify revenue and expense accuracy' },
  { round: 2, name: 'Bank statements', purpose: 'Confirm cash position and transaction history' },
  { round: 2, name: 'Revenue breakdown', purpose: 'Understand customer concentration and pricing' },
  { round: 2, name: 'Expense breakdown', purpose: 'Assess spending allocation and efficiency' },
  { round: 2, name: 'Cash flow projection', purpose: 'Evaluate runway and fundraising needs' },
  { round: 2, name: 'SAFEs/convertible notes', purpose: 'Understand future dilution obligations' },
  { round: 2, name: 'Historical P&L', purpose: 'Assess trend and trajectory' },

  // Round 3 Documents
  { round: 3, name: 'Term sheet', purpose: 'Understand previous investment terms' },
  { round: 3, name: 'Shareholder agreements', purpose: 'Verify control and governance provisions' },
  { round: 3, name: 'Employment contracts', purpose: 'Identify key person dependencies' },
  { round: 3, name: 'IP assignment documents', purpose: 'Verify company owns all IP' },
  { round: 3, name: 'Insurance policies', purpose: 'Assess risk coverage' },
  { round: 3, name: 'Customer contracts', purpose: 'Identify revenue concentration and change-of-control risks' },
  { round: 3, name: 'Regulatory approvals', purpose: 'Verify compliance and licenses' },
  { round: 3, name: 'Litigation history', purpose: 'Identify legal risks' },

  // Round 4 Documents
  { round: 4, name: 'Org chart', purpose: 'Understand team structure and gaps' },
  { round: 4, name: 'Key employee contracts', purpose: 'Verify retention and compensation' },
  { round: 4, name: 'Technology architecture', purpose: 'Assess technical risk' },
  { round: 4, name: 'Customer support logs', purpose: 'Evaluate support quality and retention' },
  { round: 4, name: 'Product roadmap', purpose: 'Understand execution plan' },
  { round: 4, name: 'Facilities lease', purpose: 'Identify material obligations' },
  { round: 4, name: 'Vendor agreements', purpose: 'Understand key vendor relationships' },

  // Round 5 Documents
  { round: 5, name: 'Market analysis', purpose: 'Verify market size and addressability' },
  { round: 5, name: 'Competitive landscape', purpose: 'Assess competitive positioning' },
  { round: 5, name: 'Investment memo', purpose: 'Document investment thesis' },
  { round: 5, name: 'Cap table (post-investment)', purpose: 'Confirm final ownership structure' },
  { round: 5, name: 'Founder biography', purpose: 'Verify background and experience' }
];

export const SECTOR_MODULES = {
  A: {
    name: 'Physical Service',
    description: 'Cleaning, staffing, logistics, field service',
    additionalQuestions: [
      'How do you ensure consistent service quality across locations?',
      'What\'s your worker retention rate and how do you address it?',
      'How scalable is your unit economics with geographic expansion?'
    ],
    verificationSteps: [
      'Visit at least one service location',
      'Interview 3-5 customers directly',
      'Verify worker insurance and compliance'
    ]
  },
  B: {
    name: 'Retail',
    description: 'E-commerce, marketplace, stores',
    additionalQuestions: [
      'What\'s your merchandise return rate and what\'s driving it?',
      'How do you manage inventory and prevent stockouts?',
      'What\'s your customer acquisition cost vs. lifetime value by channel?'
    ],
    verificationSteps: [
      'Audit inventory accuracy',
      'Review customer reviews and ratings',
      'Verify supplier relationships and terms'
    ]
  },
  C: {
    name: 'Food',
    description: 'Restaurants, food tech, delivery, supply',
    additionalQuestions: [
      'What\'s your food cost percentage and how do you manage supplier relationships?',
      'How do you maintain quality control across locations?',
      'What\'s your health and safety record?'
    ],
    verificationSteps: [
      'Visit restaurants or facilities',
      'Review health inspection records',
      'Verify food safety certifications'
    ]
  },
  D: {
    name: 'Software',
    description: 'SaaS, B2B software, B2C apps, platforms',
    additionalQuestions: [
      'What\'s your net revenue retention and expansion revenue percentage?',
      'How do you handle technical debt and platform upgrades?',
      'What\'s your data security and privacy posture?'
    ],
    verificationSteps: [
      'Technical security audit',
      'Review API documentation and integrations',
      'Verify SOC 2 or equivalent certifications'
    ]
  },
  E: {
    name: 'Manufacturing',
    description: 'Hardware, production, supply chain',
    additionalQuestions: [
      'What\'s your manufacturing cost per unit and how does it scale?',
      'How do you manage supply chain and component sourcing?',
      'What\'s your quality control process and defect rate?'
    ],
    verificationSteps: [
      'Visit manufacturing facility',
      'Verify supplier agreements and lead times',
      'Review quality control processes and testing'
    ]
  },
  F: {
    name: 'Health & Wellness',
    description: 'Aesthetics, dentistry, clinics, medical, cosmetic, wellness',
    additionalQuestions: [
      'What clinical / regulatory approvals or licences do you hold, and how are they renewed?',
      'How do you handle patient / client records, consent and data protection?',
      'What is your practitioner retention plan and how are qualifications verified?'
    ],
    verificationSteps: [
      'Verify practising licences and professional body registration',
      'Review clinical incident and complaints log',
      'Confirm insurance cover for practitioners and premises'
    ]
  }
};

export const VERIFICATION_TRIANGLE = {
  description: 'Every claim requires validation from 3 sources',
  sources: [
    {
      name: 'Founder Word',
      description: 'Interview response and founder statement',
      weight: 1,
      verification: 'Audio recording and transcript'
    },
    {
      name: 'Documents',
      description: 'Uploaded financial statements, contracts, or evidence',
      weight: 1.5,
      verification: 'Third-party documents (bank statements, customer contracts, filings)'
    },
    {
      name: 'Independent Observation',
      description: 'Verification through external source (customer interview, site visit, reference call)',
      weight: 2,
      verification: 'Customer interviews, vendor calls, regulatory records'
    }
  ]
};

export const RED_FLAG_DECISION_FRAMEWORK = {
  WALK_AWAY: {
    name: 'Walk Away',
    description: 'Fatal flaw that prevents investment',
    examples: [
      'Founder has fraud or ethics history',
      'Revenue model fundamentally doesn\'t work',
      'Operating without required licenses',
      'All revenue concentrated in 1-2 customers',
      'Unit economics don\'t support business model'
    ]
  },
  PRICE_IT_IN: {
    name: 'Price It In',
    description: 'Known risk that can be managed or mitigated',
    examples: [
      'First-time founder (mitigated by strong CTO)',
      'Team missing one key skill (can be hired)',
      'Long customer acquisition cycle',
      'High churn but improving',
      'Competitive market (differentiation clear)'
    ]
  },
  MONITOR: {
    name: 'Monitor',
    description: 'Watch during due diligence, likely to resolve naturally',
    examples: [
      'Revenue concentration declining naturally',
      'New key hire not fully ramped yet',
      'Founder learning curve for first-time CEO',
      'Market validation still underway',
      'Technology stack modernization planned'
    ]
  }
};

export const INVESTMENT_MEMO_TEMPLATE = {
  sections: [
    'Executive Summary',
    'Market Opportunity',
    'Company & Product',
    'Business Model & Unit Economics',
    'Team',
    'Competitive Landscape',
    'Key Risks & Mitigants',
    'Financial Projections',
    'Valuation & Ask',
    'Investment Highlights',
    'Red Flags Summary',
    'Recommendation'
  ]
};

export const PRACTICAL_WORKFLOW_RULES = [
  'Record every interview conversation for transcript and voice analysis',
  'Document red flags immediately in real-time',
  'Verify top 3 revenue sources before Round 4',
  'Require founder to walk through full cap table personally',
  'Never complete Round 5 without at least 3 customer reference calls',
  'If any WALK_AWAY flag discovered, exit immediately - don\'t continue diligence',
  'Make a Y/N decision on investment within 5 business days of final interview',
  'Board approval required if recommendation is PASS with >3 PRICE_IT_IN flags'
];
