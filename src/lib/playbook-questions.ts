// Given a Playbook (toolkit) id, return the ordered steps + per-step questions and
// required documents that drive the Live Workspace stepper + left-hand questions column.
//
// Today only the DD Intelligence Engine template (toolkits.kind === "due_diligence")
// has a real designer -- it maps to dd_framework_rounds / dd_framework_questions /
// dd_framework_documents. Any other playbook (or no playbook selected) falls back to a
// single generic "Meeting" step with no questions, which keeps the workspace usable
// while a custom designer is not yet built out.

import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllFrameworkRounds,
  type FrameworkQuestion,
  type FrameworkDocument,
  type FrameworkRound,
} from "@/lib/dd-framework-admin";

export type PlaybookStep = {
  key: number;
  title: string;
  subtitle: string | null;
  purpose: string | null;
};

export type PlaybookStepDetail = {
  step: PlaybookStep;
  questions: FrameworkQuestion[];
  documents: FrameworkDocument[];
};

export type PlaybookShape = {
  playbookId: string | null;
  playbookName: string;
  kind: "due_diligence" | "custom" | "none";
  steps: PlaybookStep[];
};

const FALLBACK_STEP: PlaybookStep = {
  key: 1,
  title: "Meeting",
  subtitle: null,
  purpose: null,
};

function stepsFromDDRounds(rows: FrameworkRound[]): PlaybookStep[] {
  return rows.map((r) => ({ key: r.round, title: r.title, subtitle: r.subtitle, purpose: r.purpose }));
}

export async function fetchPlaybookShape(playbookId: string | null): Promise<PlaybookShape> {
  if (!playbookId) {
    // Legacy interviews with no playbook — assume DD template so the historical
    // 5-round experience is preserved when re-opening older sessions.
    try {
      const rounds = await fetchAllFrameworkRounds();
      if (rounds.length) return { playbookId: null, playbookName: "DD Intelligence Engine", kind: "due_diligence", steps: stepsFromDDRounds(rounds) };
    } catch {}
    return { playbookId: null, playbookName: "Meeting", kind: "none", steps: [FALLBACK_STEP] };
  }
  const { data: tk, error } = await (supabase as any)
    .from("toolkits")
    .select("id, name, kind")
    .eq("id", playbookId)
    .maybeSingle();
  if (error) throw error;
  if (!tk) return { playbookId, playbookName: "Meeting", kind: "none", steps: [FALLBACK_STEP] };
  if ((tk.kind as string) === "due_diligence") {
    const rounds = await fetchAllFrameworkRounds();
    return {
      playbookId,
      playbookName: tk.name,
      kind: "due_diligence",
      steps: rounds.length ? stepsFromDDRounds(rounds) : [FALLBACK_STEP],
    };
  }
  return { playbookId, playbookName: tk.name, kind: "custom", steps: [FALLBACK_STEP] };
}

export async function fetchPlaybookStepDetail(
  shape: PlaybookShape,
  stepKey: number,
): Promise<PlaybookStepDetail> {
  const step = shape.steps.find((s) => s.key === stepKey) ?? shape.steps[0] ?? FALLBACK_STEP;
  if (shape.kind !== "due_diligence") {
    return { step, questions: [], documents: [] };
  }
  const [q, d] = await Promise.all([
    (supabase.from("dd_framework_questions") as any).select("*").eq("round", step.key).order("sort_order"),
    (supabase.from("dd_framework_documents") as any).select("*").eq("round", step.key).order("sort_order"),
  ]);
  if (q.error) throw q.error;
  if (d.error) throw d.error;
  return {
    step,
    questions: (q.data ?? []) as FrameworkQuestion[],
    documents: (d.data ?? []) as FrameworkDocument[],
  };
}
