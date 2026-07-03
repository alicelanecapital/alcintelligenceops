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
  return {
    company: company.data,
    founders: (founders.data ?? []).map((x: any) => x.founder).filter(Boolean),
    meetings: meetings.data ?? [], notes: notes.data ?? [], tasks: tasks.data ?? [], documents: docs.data ?? [],
    opportunities: opps.data ?? [], investments: investments.data ?? [],
  };
}

export async function fetchOpportunities() {
  const { data, error } = await supabase.from("opportunities").select("*, founder:founders(id, name), company:companies(id, name)").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
