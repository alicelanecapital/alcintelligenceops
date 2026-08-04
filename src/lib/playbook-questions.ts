// Given a Playbook (toolkit) id, return the ordered steps + per-step questions and
// required documents that drive the Live Workspace stepper + left-hand questions column.
//
// Every toolkit (DD Intelligence Engine or a custom playbook like "Pitch Playbook") owns
// its own rounds in the shared dd_framework_rounds table, scoped by toolkit_id. A playbook
// with no rounds configured yet falls back to a single generic "Meeting" step with no
// questions, which keeps the workspace usable while it's still being designed.

import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllFrameworkRounds,
  fetchDueDiligenceToolkitId,
  type FrameworkQuestion,
  type FrameworkDocument,
  type FrameworkRound,
} from "@/lib/dd-framework-admin";
import { resolveWorkspaceLayout, DEFAULT_WORKSPACE_LAYOUT, type WorkspacePanelKey } from "@/lib/workspace-layouts";

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
  workspacePanels: WorkspacePanelKey[];
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
      const ddToolkitId = await fetchDueDiligenceToolkitId();
      const rounds = ddToolkitId ? await fetchAllFrameworkRounds(ddToolkitId) : [];
      if (rounds.length) return { playbookId: null, playbookName: "DD Intelligence Engine", kind: "due_diligence", steps: stepsFromDDRounds(rounds), workspacePanels: DEFAULT_WORKSPACE_LAYOUT };
    } catch {}
    return { playbookId: null, playbookName: "Meeting", kind: "none", steps: [FALLBACK_STEP], workspacePanels: DEFAULT_WORKSPACE_LAYOUT };
  }
  // Falls back to selecting without workspace_layout if that column hasn't been migrated
  // in yet on this database -- the Live Workspace should never hard-fail to load a meeting
  // just because a cosmetic layout-customisation column is missing.
  let tk: any;
  {
    const { data, error } = await (supabase as any).from("toolkits").select("id, name, kind, workspace_layout").eq("id", playbookId).maybeSingle();
    if (error) {
      const fallback = await (supabase as any).from("toolkits").select("id, name, kind").eq("id", playbookId).maybeSingle();
      if (fallback.error) throw fallback.error;
      tk = fallback.data;
    } else {
      tk = data;
    }
  }
  if (!tk) return { playbookId, playbookName: "Meeting", kind: "none", steps: [FALLBACK_STEP], workspacePanels: DEFAULT_WORKSPACE_LAYOUT };
  const rounds = await fetchAllFrameworkRounds(playbookId);
  return {
    playbookId,
    playbookName: tk.name,
    kind: (tk.kind as string) === "due_diligence" ? "due_diligence" : "custom",
    steps: rounds.length ? stepsFromDDRounds(rounds) : [FALLBACK_STEP],
    workspacePanels: resolveWorkspaceLayout(tk.workspace_layout).panels,
  };
}

export async function fetchPlaybookStepDetail(
  shape: PlaybookShape,
  stepKey: number,
): Promise<PlaybookStepDetail> {
  const step = shape.steps.find((s) => s.key === stepKey) ?? shape.steps[0] ?? FALLBACK_STEP;
  if (shape.kind === "none") {
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
