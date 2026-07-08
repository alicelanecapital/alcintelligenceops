import { supabase } from "@/integrations/supabase/client";

export type FrameworkRedFlag = { text: string; severity: "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR" };

export type FrameworkRound = {
  round: number;
  title: string;
  subtitle: string | null;
  purpose: string | null;
  duration: string | null;
};

export type FrameworkQuestion = {
  id: string;
  round: number;
  sort_order: number;
  question_text: string;
  why_text: string | null;
  internal_steps: string[] | null;
  red_flags: FrameworkRedFlag[] | null;
};

export type FrameworkDocument = {
  id: string;
  round: number;
  sort_order: number;
  name: string;
  purpose: string | null;
};

export async function fetchAllFrameworkRounds(): Promise<FrameworkRound[]> {
  const { data, error } = await supabase.from("dd_framework_rounds").select("*").order("round");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFrameworkRoundDetail(round: number) {
  const [roundRow, questions, documents] = await Promise.all([
    supabase.from("dd_framework_rounds").select("*").eq("round", round).single(),
    supabase.from("dd_framework_questions").select("*").eq("round", round).order("sort_order"),
    supabase.from("dd_framework_documents").select("*").eq("round", round).order("sort_order"),
  ]);
  if (roundRow.error) throw roundRow.error;
  if (questions.error) throw questions.error;
  if (documents.error) throw documents.error;
  return {
    round: roundRow.data as FrameworkRound,
    questions: (questions.data ?? []) as FrameworkQuestion[],
    documents: (documents.data ?? []) as FrameworkDocument[],
  };
}

export async function updateFrameworkRound(round: number, payload: Partial<FrameworkRound>) {
  const { error } = await supabase.from("dd_framework_rounds").update(payload).eq("round", round);
  if (error) throw error;
}

export async function createFrameworkQuestion(round: number, sortOrder: number) {
  const { data, error } = await supabase
    .from("dd_framework_questions")
    .insert({ round, sort_order: sortOrder, question_text: "New question", why_text: "", internal_steps: [], red_flags: [] })
    .select()
    .single();
  if (error) throw error;
  return data as FrameworkQuestion;
}

export async function updateFrameworkQuestion(id: string, payload: Partial<FrameworkQuestion>) {
  const { error } = await supabase.from("dd_framework_questions").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteFrameworkQuestion(id: string) {
  const { error } = await supabase.from("dd_framework_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFrameworkQuestions(items: { id: string; sort_order: number }[]) {
  await Promise.all(items.map((it) => supabase.from("dd_framework_questions").update({ sort_order: it.sort_order }).eq("id", it.id)));
}

export async function createFrameworkDocument(round: number, sortOrder: number) {
  const { data, error } = await supabase
    .from("dd_framework_documents")
    .insert({ round, sort_order: sortOrder, name: "New document", purpose: "" })
    .select()
    .single();
  if (error) throw error;
  return data as FrameworkDocument;
}

export async function updateFrameworkDocument(id: string, payload: Partial<FrameworkDocument>) {
  const { error } = await supabase.from("dd_framework_documents").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteFrameworkDocument(id: string) {
  const { error } = await supabase.from("dd_framework_documents").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFrameworkDocuments(items: { id: string; sort_order: number }[]) {
  await Promise.all(items.map((it) => supabase.from("dd_framework_documents").update({ sort_order: it.sort_order }).eq("id", it.id)));
}
