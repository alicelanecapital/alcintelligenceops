import { supabase } from "@/integrations/supabase/client";

export type OrgRow = {
  id: string; name: string; kind: "sme" | "ecosystem"; category: string | null;
  industry: string | null; purpose: string | null; who_they_serve: string | null;
  fit_rating: string | null; status: string | null; notes: string | null;
  province: string | null; city: string | null;
  relationship_strength: number | null; strategic_importance: number | null;
  sme_quality: number | null; deals_generated: number | null;
  ai_relationship_score: number | null; created_at: string;
};

export async function fetchOrgs(kind?: "sme" | "ecosystem") {
  let q = supabase.from("organisations").select("*").order("name");
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as OrgRow[];
}

export async function fetchDeals() {
  const { data, error } = await supabase.from("deals").select("*, organisation:organisations(name, industry, category), founder:founders(name)").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFounders() {
  const { data, error } = await supabase.from("founders").select("*, organisation:organisations(name, category)").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchContacts() {
  const { data, error } = await supabase.from("contacts").select("*, organisation:organisations(name, kind)").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchEvents() {
  const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createEvent(input: { name: string; start_date?: string | null }) {
  const payload: any = { name: input.name.trim() };
  if (input.start_date) payload.start_date = input.start_date;
  const { data, error } = await supabase.from("events").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}


export async function updateDealStage(id: string, stage: string) {
  const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
  if (error) throw error;
}

export const DEAL_STAGES = [
  "New Opportunity",
  "Initial Screening",
  "First Meeting",
  "Due Diligence",
  "Deep Dive",
  "IC Prep",
  "Term Sheet",
  "Legal & Docs",
  "Funded",
  "Portfolio",
  "Passed",
] as const;
