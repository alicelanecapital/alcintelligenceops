import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;


export async function saveWorkflowResponse(
  opportunityId: string,
  step: number,
  stepName: string,
  responses: Record<string, string>,
  transcripts?: Record<string, string>,
  status: "in_progress" | "paused" | "completed" = "in_progress"
) {
  try {
    const { data, error } = await supabase
      .from("dd_workflow_responses")
      .insert({
        opportunity_id: opportunityId,
        step,
        step_name: stepName,
        responses,
        transcripts: transcripts || {},
        status,
        started_at: new Date().toISOString(),
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Failed to save workflow response:", err);
    throw err;
  }
}

export async function getWorkflowResponse(opportunityId: string, step: number) {
  try {
    const { data, error } = await supabase
      .from("dd_workflow_responses")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .eq("step", step)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (err) {
    console.error("Failed to fetch workflow response:", err);
    throw err;
  }
}

export async function updateWorkflowStep(
  opportunityId: string,
  step: number,
  status: "in_progress" | "paused" | "completed" = "in_progress"
) {
  try {
    const { error } = await supabase
      .from("opportunities")
      .update({
        current_workflow_step: step,
        workflow_status: status,
        workflow_paused_at: status === "paused" ? new Date().toISOString() : null,
      })
      .eq("id", opportunityId);

    if (error) throw error;
  } catch (err) {
    console.error("Failed to update workflow step:", err);
    throw err;
  }
}
