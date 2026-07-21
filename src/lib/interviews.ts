// Client-side data helpers for interviews.
import { supabase } from "@/integrations/supabase/client";

export const INTERVIEW_STAGES = [
  { name: "Founder", topics: ["Motivation", "Background", "Experience", "Decision making", "Leadership", "Vision", "Coachability"] },
  { name: "Business", topics: ["Problem", "Solution", "Customers", "Pricing", "Revenue", "Margins", "Growth", "Operations", "Technology", "Competition"] },
  { name: "Financial Health", topics: ["Revenue quality", "Gross margins", "Cash flow", "Debt", "Tax", "VAT", "Working capital", "Owner drawings", "Financial controls"] },
  { name: "Operations", topics: ["Processes", "Systems", "Staff", "Suppliers", "Inventory", "Reporting", "Quality control", "Scalability"] },
  { name: "Market", topics: ["Customers", "Competition", "Market size", "Retention", "Sales pipeline", "Growth"] },
  { name: "Investment", topics: ["Capital required", "Use of funds", "Exit strategy", "Founder expectations", "Ownership"] },
] as const;

export async function listInterviews() {
  const { data, error } = await (supabase.from("interviews") as any)
    .select("*")
    .eq("hidden", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setInterviewPrivate(id: string, isPrivate: boolean) {
  const { error } = await (supabase.from("interviews") as any).update({ is_private: isPrivate }).eq("id", id);
  if (error) throw error;
}

export async function dismissInterview(id: string) {
  const { error } = await (supabase.from("interviews") as any).update({ hidden: true }).eq("id", id);
  if (error) throw error;
}

export async function getInterview(id: string) {
  const { data, error } = await supabase.from("interviews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUtterances(id: string) {
  const { data, error } = await supabase.from("interview_utterances").select("*").eq("interview_id", id).order("ts_ms");
  if (error) throw error;
  return data ?? [];
}

export async function getAnalyses(id: string) {
  const { data, error } = await supabase.from("interview_analyses").select("*").eq("interview_id", id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReport(id: string) {
  const { data, error } = await supabase.from("interview_reports").select("*").eq("interview_id", id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDocRequests(id: string) {
  const { data, error } = await supabase.from("document_requests").select("*").eq("interview_id", id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertUtterance(interviewId: string, u: { ts_ms: number; speaker: string; text: string; confidence?: number }) {
  const { data, error } = await supabase.from("interview_utterances").insert({ interview_id: interviewId, ...u }).select("*").single();
  if (error) throw error;
  return data;
}

export async function editUtterance(id: string, text: string) {
  const { error } = await supabase.from("interview_utterances").update({ text, edited: true }).eq("id", id);
  if (error) throw error;
}

export async function saveNote(interviewId: string, section: string, body: string) {
  // Upsert-by-section: delete then insert to keep it simple.
  await supabase.from("interview_notes").delete().eq("interview_id", interviewId).eq("section", section);
  const { error } = await supabase.from("interview_notes").insert({ interview_id: interviewId, section, body });
  if (error) throw error;
}

export async function getNotes(id: string) {
  const { data, error } = await supabase.from("interview_notes").select("*").eq("interview_id", id);
  if (error) throw error;
  return data ?? [];
}

export async function setInterviewStatus(id: string, patch: Partial<{ status: string; current_stage: string; started_at: string; ended_at: string }>) {
  const { error } = await supabase.from("interviews").update(patch).eq("id", id);
  if (error) throw error;
}

export async function stopInterview(id: string) {
  await setInterviewStatus(id, { status: "completed", ended_at: new Date().toISOString() });
}

