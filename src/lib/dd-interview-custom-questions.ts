import { supabase } from "@/integrations/supabase/client";

export type CustomQuestion = {
  id: string;
  interview_id: string;
  question_text: string;
  sort_order: number;
  created_at: string;
};

export async function listCustomQuestions(interviewId: string): Promise<CustomQuestion[]> {
  const { data, error } = await (supabase.from("dd_interview_custom_questions" as any) as any)
    .select("*")
    .eq("interview_id", interviewId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function addCustomQuestion(interviewId: string, questionText: string): Promise<CustomQuestion> {
  const { data: existing } = await (supabase.from("dd_interview_custom_questions" as any) as any)
    .select("sort_order")
    .eq("interview_id", interviewId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = ((existing?.[0] as any)?.sort_order ?? -1) + 1;

  const { data, error } = await (supabase.from("dd_interview_custom_questions" as any) as any)
    .insert({ interview_id: interviewId, question_text: questionText, sort_order: nextSort })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomQuestion(id: string, questionText: string): Promise<void> {
  const { error } = await (supabase.from("dd_interview_custom_questions" as any) as any)
    .update({ question_text: questionText })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCustomQuestion(id: string): Promise<void> {
  const { error } = await (supabase.from("dd_interview_custom_questions" as any) as any).delete().eq("id", id);
  if (error) throw error;
}
