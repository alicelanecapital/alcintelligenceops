import { supabase } from "@/integrations/supabase/client";

export async function fetchFounderProfile(id: string) {
  const [founder, companies, opps, meetings, notes, tasks, docs, timeline, contacts, interviews, comms, investments, intel, signals] = await Promise.all([
    supabase.from("founders").select("*, organisation:organisations(*)").eq("id", id).single(),
    supabase.from("founder_companies").select("*, company:companies(*)").eq("founder_id", id),
    supabase.from("opportunities").select("*, company:companies(name)").eq("founder_id", id).order("created_at", { ascending: false }),
    supabase.from("meetings").select("*").eq("founder_id", id).order("meeting_date", { ascending: false }),
    supabase.from("notes").select("*").eq("founder_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("founder_id", id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("founder_id", id).order("created_at", { ascending: false }),
    supabase.from("timeline_events").select("*").eq("founder_id", id).order("occurred_at", { ascending: false }).limit(200),
    supabase.from("contacts").select("*").eq("founder_id" as any, id),
    supabase.from("interviews").select("*").eq("founder_id", id).order("started_at", { ascending: false }),
    supabase.from("communications").select("*").eq("founder_id", id).order("occurred_at", { ascending: false }),
    supabase.from("investments").select("*").eq("founder_id", id),
    supabase.from("founder_intelligence").select("*").eq("founder_id", id).maybeSingle(),
    supabase.from("relationship_signals").select("*").eq("founder_id", id).maybeSingle(),
  ]);
  if (founder.error) throw founder.error;
  return {
    founder: founder.data,
    companies: companies.data ?? [],
    opportunities: opps.data ?? [],
    meetings: meetings.data ?? [],
    notes: notes.data ?? [],
    tasks: tasks.data ?? [],
    documents: docs.data ?? [],
    timeline: timeline.data ?? [],
    contacts: (contacts.data as any[]) ?? [],
    interviews: interviews.data ?? [],
    communications: comms.data ?? [],
    investments: investments.data ?? [],
    intel: intel.data,
    signals: signals.data,
  };
}

export async function addFounderNote(founder_id: string, body: string, author?: string) {
  const { data, error } = await supabase.from("notes").insert({ founder_id, body, author: author ?? "Interviewer" }).select().single();
  if (error) throw error;
  await supabase.from("timeline_events").insert({ founder_id, event_type: "note", title: "Note added", body: body.slice(0, 200), source_type: "notes", source_id: data.id });
  return data;
}

export async function addFounderTask(founder_id: string, title: string, due?: string) {
  const { data, error } = await supabase.from("tasks").insert({ founder_id, title, due_date: due ?? null }).select().single();
  if (error) throw error;
  await supabase.from("timeline_events").insert({ founder_id, event_type: "task", title: `Task: ${title}`, source_type: "tasks", source_id: data.id });
  return data;
}

export async function fetchAllMeetings() {
  const { data, error } = await supabase
    .from("meetings")
    .select("*, founder:founders(id, name), company:companies(id, name)")
    .order("meeting_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, founder:founders(id, name), company:companies(id, name), opportunity:opportunities(id, name)")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTask(payload: any) {
  const { data, error } = await supabase.from("tasks").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, payload: any) {
  const { data, error } = await supabase.from("tasks").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function addFounderMeeting(founder_id: string, payload: { title: string; meeting_date?: string; agenda?: string; summary?: string }) {
  const { data, error } = await supabase.from("meetings").insert({ founder_id, ...payload }).select().single();
  if (error) throw error;
  await supabase.from("timeline_events").insert({ founder_id, event_type: "meeting", title: payload.title, body: payload.summary ?? null, source_type: "meetings", source_id: data.id });
  return data;
}

export async function addCompanyForFounder(founder_id: string, name: string, industry?: string) {
  const { data: company, error } = await supabase.from("companies").insert({ name, industry }).select().single();
  if (error) throw error;
  await supabase.from("founder_companies").insert({ founder_id, company_id: company.id, role: "Founder" });
  await supabase.from("timeline_events").insert({ founder_id, company_id: company.id, event_type: "company", title: `Company added: ${name}`, source_type: "companies", source_id: company.id });
  return company;
}

export async function addOpportunity(founder_id: string, name: string, industry?: string) {
  const { data, error } = await supabase.from("opportunities").insert({ founder_id, name, industry }).select().single();
  if (error) throw error;
  await supabase.from("timeline_events").insert({ founder_id, event_type: "opportunity", title: `Opportunity: ${name}`, source_type: "opportunities", source_id: data.id });
  return data;
}

export async function fetchCompanies() {
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCompanyProfile(id: string) {
  const [company, founders, meetings, notes, tasks, docs, opps, investments] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase.from("founder_companies").select("*, founder:founders(*)").eq("company_id", id),
    supabase.from("meetings").select("*").eq("company_id", id).order("meeting_date", { ascending: false }),
    supabase.from("notes").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunities").select("*").eq("company_id", id),
    supabase.from("investments").select("*").eq("company_id", id),
  ]);
  if (company.error) throw company.error;
  const founderRows = (founders.data ?? []).map((x: any) => x.founder).filter(Boolean);
  // Founders no longer have their own profile route -- contacts is the current
  // unified model. Look up each founder's corresponding contact (migrated via
  // legacy_founder_id) so callers can link to /contacts/ instead.
  const founderIds = founderRows.map((f: any) => f.id);
  const contactLinks = founderIds.length
    ? await supabase.from("contacts").select("id, legacy_founder_id").in("legacy_founder_id", founderIds)
    : { data: [] };
  const contactIdByFounderId = new Map((contactLinks.data ?? []).map((c: any) => [c.legacy_founder_id, c.id]));
  const foundersWithContact = founderRows.map((f: any) => ({ ...f, contact_id: contactIdByFounderId.get(f.id) ?? null }));
  return {
    company: company.data,
    founders: foundersWithContact,
    meetings: meetings.data ?? [], notes: notes.data ?? [], tasks: tasks.data ?? [], documents: docs.data ?? [],
    opportunities: opps.data ?? [], investments: investments.data ?? [],
  };
}

export async function fetchOpportunities() {
  const { data, error } = await supabase.from("opportunities").select("*, founder:founders(id, name), company:companies(id, name)").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOpportunitiesWithDDStatus() {
  const [{ data: opps, error: oppsError }, { data: interviews, error: interviewsError }] = await Promise.all([
    supabase.from("opportunities").select("*, founder:founders(id, name, contact_id), company:companies(id, name)").order("created_at", { ascending: false }),
    supabase.from("dd_interviews").select("opportunity_id, round, status, detected_sector, sector_confidence"),
  ]);
  if (oppsError) throw oppsError;
  if (interviewsError) throw interviewsError;

  const byOpportunity = new Map<string, { round: number; sector: string | null; confidence: number | null }>();
  for (const iv of interviews ?? []) {
    const existing = byOpportunity.get(iv.opportunity_id);
    if (!existing || iv.round >= existing.round) {
      byOpportunity.set(iv.opportunity_id, {
        round: iv.round,
        sector: iv.detected_sector ?? existing?.sector ?? null,
        confidence: iv.sector_confidence ?? existing?.confidence ?? null,
      });
    } else if (!existing.sector && iv.detected_sector) {
      existing.sector = iv.detected_sector;
      existing.confidence = iv.sector_confidence ?? null;
    }
  }

  // Photos are fetched separately (own try/catch) so a database that hasn't run the
  // contacts.photo_url migration yet still loads the rest of the pipeline normally --
  // Postgres rejects the whole query otherwise if any selected column doesn't exist.
  const photoByContactId = new Map<string, string>();
  try {
    const contactIds = new Set<string>();
    for (const opp of opps ?? []) {
      if ((opp as any).contact_id) contactIds.add((opp as any).contact_id);
      if ((opp as any).founder?.contact_id) contactIds.add((opp as any).founder.contact_id);
    }
    if (contactIds.size) {
      const { data: contactPhotos, error: photosError } = await (supabase.from("contacts") as any)
        .select("id, photo_url")
        .in("id", [...contactIds]);
      if (photosError) throw photosError;
      for (const c of (contactPhotos ?? []) as any[]) {
        if (c.photo_url) photoByContactId.set(c.id, c.photo_url);
      }
    }
  } catch (error) {
    console.error("Failed to load contact photos (contacts.photo_url may not be migrated yet):", error);
  }

  return (opps ?? []).map((opp: any) => {
    const status = byOpportunity.get(opp.id);
    return {
      ...opp,
      dd_current_round: status?.round ?? null,
      dd_detected_sector: status?.sector ?? null,
      dd_sector_confidence: status?.confidence ?? null,
      // Contact-based opportunities link directly; founder-based ones link via the founder's
      // own contact record -- either way, surface whichever photo is actually available.
      dd_photo_url: photoByContactId.get(opp.contact_id) ?? photoByContactId.get(opp.founder?.contact_id) ?? null,
    };
  });
}

export async function updateFounderAssessment(id: string, payload: {
  truthfulness_score?: number | null;
  commercial_instinct_score?: number | null;
  coachability_score?: number | null;
  owner_mentality_score?: number | null;
  founder_archetype?: string | null;
  assessment_notes?: string | null;
}) {
  const { data, error } = await supabase.from("founders").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityScreening(id: string, payload: {
  mess_classification?: string | null;
  mess_notes?: string | null;
  screening_step?: number | null;
  screening_outcome?: string | null;
  screening_outcome_reason?: string | null;
  investment_criteria?: Record<string, boolean>;
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityDiagnostic(id: string, payload: {
  diagnostic?: Record<string, { rating?: string; notes?: string; evidence?: string }>;
  diagnostic_score?: number | null;
  diagnostic_recommendation?: string | null;
  diagnostic_summary?: string | null;
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityDiligence(id: string, payload: {
  diligence_checklist?: Record<string, { status?: string; notes?: string }>;
  diligence_stop_points?: Record<string, boolean>;
  diligence_output?: Record<string, string>;
  diligence_recommendation?: string | null;
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityStructuring(id: string, payload: {
  valuation_method?: string | null;
  valuation_amount?: number | null;
  valuation_notes?: string | null;
  proposed_instrument?: string | null;
  equity_stake_pct?: number | null;
  protective_rights?: Record<string, boolean>;
  use_of_funds_allocations?: { use: string; amount: string; evidence: string }[];
  use_of_funds_approval_notes?: string | null;
  staged_release?: { tranche: string; focus: string; released: boolean }[];
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityHundredDayPlan(id: string, payload: {
  hundred_day_plan?: { day_range: string; initiative: string; owner: string; expected_outcome: string }[];
  hundred_day_milestones?: { milestone: string; target_value: string; target_date: string }[];
  hundred_day_cash_plan?: number | null;
  hundred_day_approval_date?: string | null;
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityGovernance(id: string, payload: {
  governance_board_seats?: number | null;
  governance_reporting_frequency?: string | null;
  governance_board_observer?: boolean | null;
  governance_founder_salary_cap?: number | null;
  governance_personal_expense_approval_threshold?: number | null;
  governance_spending_guardrails?: Record<string, string | number>;
  governance_covenants?: { text: string; required: boolean }[];
  governance_approval_workflow?: string | null;
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function addInvestmentReview(opportunity_id: string, payload: {
  review_date?: string;
  revenue_actual?: number | null;
  revenue_target?: number | null;
  margin_actual?: number | null;
  margin_target?: number | null;
  team_count?: number | null;
  founder_availability_hours?: number | null;
  health_score?: number | null;
  founder_behaviour_score?: number | null;
  red_flags?: { flag_text: string; severity: string }[];
  notes?: string | null;
}) {
  const { data, error } = await (supabase.from("investment_reviews" as any) as any).insert({ opportunity_id, ...payload }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchInvestmentReviews(opportunity_id: string) {
  const { data, error } = await (supabase.from("investment_reviews" as any) as any).select("*").eq("opportunity_id", opportunity_id).order("review_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addInvestmentMilestone(opportunity_id: string, payload: {
  milestone_text: string;
  target_date?: string | null;
  target_value?: number | null;
  achieved?: boolean | null;
  achieved_date?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await (supabase.from("investment_milestones" as any) as any).insert({ opportunity_id, ...payload }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchInvestmentMilestones(opportunity_id: string) {
  const { data, error } = await (supabase.from("investment_milestones" as any) as any).select("*").eq("opportunity_id", opportunity_id).order("target_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateInvestmentMilestone(id: string, payload: { achieved?: boolean; achieved_date?: string | null; notes?: string }) {
  const { data, error } = await (supabase.from("investment_milestones" as any) as any).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityValueCreation(id: string, payload: {
  current_valuation?: number | null;
  valuation_history?: { date: string; valuation: number; basis: string }[];
  value_creation_initiatives?: { initiative: string; target_impact: string; achieved: boolean }[];
  exit_scenario?: string | null;
  exit_multiple?: number | null;
  projected_irr?: number | null;
  realized_exit_date?: string | null;
  realized_exit_amount?: number | null;
  realized_irr?: number | null;
  realized_multiple?: number | null;
}) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// === CRUD Operations ===

export async function createEvent(payload: any) {
  const { data, error } = await supabase.from("events").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, payload: any) {
  const { data, error } = await supabase.from("events").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function createContact(payload: any) {
  const { data, error } = await supabase.from("contacts").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id: string, payload: any) {
  const { data, error } = await supabase.from("contacts").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

export async function createCompany(payload: any) {
  const { data, error } = await supabase.from("companies").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateCompany(id: string, payload: any) {
  const { data, error } = await supabase.from("companies").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteOrganisation(id: string) {
  const { error } = await supabase.from("organisations").delete().eq("id", id);
  if (error) throw error;
}

export async function createOrganisation(payload: any) {
  const { data, error } = await supabase.from("organisations").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateOrganisation(id: string, payload: any) {
  const { data, error } = await supabase.from("organisations").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function createOpportunity(payload: any) {
  const { data, error } = await supabase.from("opportunities").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpportunity(id: string, payload: any) {
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOpportunity(id: string) {
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw error;
}

export async function createFounder(payload: any) {
  const { data, error } = await supabase.from("founders").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateFounder(id: string, payload: any) {
  const { data, error } = await supabase.from("founders").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFounder(id: string) {
  const { error } = await supabase.from("founders").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchContactsByOrg(org_id: any) {
  const { data, error } = await supabase.from("contacts").select("*").eq("organisation_id", org_id);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOpportunityProfile(id: string) {
  const [opp, meetings, notes, tasks, docs] = await Promise.all([
    supabase.from("opportunities").select("*, founder:founders(id, name), company:companies(id, name)").eq("id", id).single(),
    supabase.from("meetings").select("*").eq("opportunity_id", id).order("meeting_date", { ascending: false }),
    supabase.from("notes").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
  ]);
  if (opp.error) throw opp.error;
  return { opportunity: opp.data, meetings: meetings.data ?? [], notes: notes.data ?? [], tasks: tasks.data ?? [], documents: docs.data ?? [] };
}
