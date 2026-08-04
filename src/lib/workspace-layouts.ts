import { supabase } from "@/integrations/supabase/client";

export type WorkspacePanelKey =
  | "questions"
  | "transcript"
  | "scoring"
  | "risk_alerts"
  | "manual_assessment"
  | "stakeholder_brief"
  | "report";

export type WorkspacePanel = { key: WorkspacePanelKey; label: string; description: string };

/** Every panel ("webpart") the Live Workspace can show, in the same grid position they
 * render in today (col1 aside / center / col4 aside / full-width below). This list IS the
 * default layout every playbook uses until someone customises it from Admin > Workspaces. */
export const WORKSPACE_PANELS: WorkspacePanel[] = [
  { key: "questions", label: "Playbook Questions", description: "Left column — the current step's questions and required documents." },
  { key: "transcript", label: "Live Transcript", description: "Center — recording controls and the streaming transcript." },
  { key: "scoring", label: "Live Scoring", description: "Center, below the transcript — AI confidence/consistency/specificity scores." },
  { key: "risk_alerts", label: "Risk Alerts & Follow-Ups", description: "Right column — risk alerts, contradictions, missing evidence, suggested follow-ups, document requests." },
  { key: "manual_assessment", label: "Manual Assessment", description: "Full width — the interviewer's own written assessment." },
  { key: "stakeholder_brief", label: "Stakeholder Brief", description: "Full width — the linked contact's existing stakeholder brief, collapsed by default." },
  { key: "report", label: "Report", description: "Full width, once available — the generated post-meeting report/memo." },
];

export const DEFAULT_WORKSPACE_LAYOUT: WorkspacePanelKey[] = WORKSPACE_PANELS.map((p) => p.key);

export type WorkspaceLayout = { panels: WorkspacePanelKey[] };

/** Every playbook uses the full default panel set until customised, so a null/empty stored
 * layout always resolves to "everything on" -- never a blank workspace by accident. */
export function resolveWorkspaceLayout(stored: unknown): WorkspaceLayout {
  const panels = (stored as WorkspaceLayout | null)?.panels;
  if (!Array.isArray(panels) || !panels.length) return { panels: DEFAULT_WORKSPACE_LAYOUT };
  return { panels: panels as WorkspacePanelKey[] };
}

export async function fetchToolkitWorkspaceLayout(toolkitId: string | null): Promise<WorkspaceLayout> {
  if (!toolkitId) return { panels: DEFAULT_WORKSPACE_LAYOUT };
  const { data, error } = await (supabase.from("toolkits" as any) as any)
    .select("workspace_layout")
    .eq("id", toolkitId)
    .maybeSingle();
  if (error) throw error;
  return resolveWorkspaceLayout(data?.workspace_layout);
}

export async function saveToolkitWorkspaceLayout(toolkitId: string, panels: WorkspacePanelKey[]): Promise<void> {
  const { error } = await (supabase.from("toolkits" as any) as any)
    .update({ workspace_layout: { panels } })
    .eq("id", toolkitId);
  if (error) throw error;
}
