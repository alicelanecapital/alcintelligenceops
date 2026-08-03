import { supabase } from "@/integrations/supabase/client";

export type ExpertFlagValidation = {
  flag: string;
  verdict: "VALIDATED" | "REFUTED" | "NOT_ADDRESSED";
  evidence: string;
};

export type ExpertNewFlag = {
  text: string;
  severity: "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR";
};

export type ExpertReview = {
  id: string;
  interview_id: string;
  consultant_name: string | null;
  file_name: string | null;
  transcript: string;
  validations: ExpertFlagValidation[];
  new_flags: ExpertNewFlag[];
  open_questions: string[];
  created_at: string;
};

export async function listExpertReviews(interviewId: string): Promise<ExpertReview[]> {
  const { data, error } = await (supabase.from("dd_expert_reviews" as any) as any)
    .select("*")
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveExpertReview(input: {
  interviewId: string;
  consultantName: string | null;
  fileName: string | null;
  transcript: string;
  validations: ExpertFlagValidation[];
  newFlags: ExpertNewFlag[];
  openQuestions: string[];
}): Promise<ExpertReview> {
  const { data, error } = await (supabase.from("dd_expert_reviews" as any) as any)
    .insert({
      interview_id: input.interviewId,
      consultant_name: input.consultantName,
      file_name: input.fileName,
      transcript: input.transcript,
      validations: input.validations,
      new_flags: input.newFlags,
      open_questions: input.openQuestions,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpertReview(id: string): Promise<void> {
  const { error } = await (supabase.from("dd_expert_reviews" as any) as any).delete().eq("id", id);
  if (error) throw error;
}
