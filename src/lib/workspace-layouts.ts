import { supabase } from "@/integrations/supabase/client";

export type WorkspacePanelKey =
  | "questions"
  | "required_documents"
  | "docbox"
  | "transcript"
  | "scoring"
  | "risk_alerts"
  | "manual_assessment"
  | "stakeholder_brief"
  | "report";

export type WorkspacePanel = { key: WorkspacePanelKey; label: string; description: string };

/** Every panel ("webpart") the Live Workspace can show. This list IS the default layout
 * every playbook uses until someone customises it from Admin > Workspaces. */
export const WORKSPACE_PANELS: WorkspacePanel[] = [
  { key: "questions", label: "Playbook Questions", description: "The current step's questions, AI grades and grading scorecards." },
  { key: "required_documents", label: "Required Documents", description: "The documents the current step requires, ticked off as they're provided." },
  { key: "docbox", label: "DocBox", description: "Drag-and-drop document upload — AI files each document against the right step and syncs it to Google Drive." },
  { key: "transcript", label: "Live Transcript", description: "Recording controls and the streaming transcript." },
  { key: "scoring", label: "Live Scoring", description: "AI confidence/consistency/specificity scores." },
  { key: "risk_alerts", label: "Risk Alerts & Follow-Ups", description: "Risk alerts, contradictions, missing evidence, suggested follow-ups, document requests." },
  { key: "manual_assessment", label: "Manual Assessment", description: "The interviewer's own written assessment and body-language observations." },
  { key: "stakeholder_brief", label: "Stakeholder Brief", description: "The linked contact's existing stakeholder brief, collapsed by default." },
  { key: "report", label: "Report", description: "Once available — the generated post-meeting report/memo." },
];

export const DEFAULT_WORKSPACE_LAYOUT: WorkspacePanelKey[] = WORKSPACE_PANELS.map((p) => p.key);

/** Panels added after templates were already being saved. A stored layout that predates
 * them has no opinion about them, so they're treated as enabled rather than hidden. */
const BACKFILLED_PANELS: WorkspacePanelKey[] = ["required_documents"];

/** The Live Workspace canvas is a fixed 6-column x 10-row grid; every panel is a block
 * placed on it (1-indexed col/row, plus how many columns/rows it spans). */
export const GRID_COLS = 6;
export const GRID_ROWS = 10;

export type WorkspaceBlock = {
  key: WorkspacePanelKey;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
};

export const DEFAULT_WORKSPACE_BLOCKS: WorkspaceBlock[] = [
  { key: "stakeholder_brief", col: 1, row: 1, colSpan: 6, rowSpan: 1 },
  { key: "questions", col: 1, row: 2, colSpan: 2, rowSpan: 2 },
  { key: "required_documents", col: 1, row: 4, colSpan: 2, rowSpan: 1 },
  { key: "docbox", col: 1, row: 5, colSpan: 2, rowSpan: 1 },
  { key: "transcript", col: 3, row: 2, colSpan: 2, rowSpan: 2 },
  { key: "scoring", col: 3, row: 4, colSpan: 2, rowSpan: 1 },
  { key: "risk_alerts", col: 5, row: 2, colSpan: 2, rowSpan: 3 },
  { key: "manual_assessment", col: 1, row: 6, colSpan: 6, rowSpan: 1 },
  { key: "report", col: 1, row: 7, colSpan: 6, rowSpan: 1 },
];


export type WorkspaceLayout = { panels: WorkspacePanelKey[]; blocks: WorkspaceBlock[] };

export const DEFAULT_LAYOUT: WorkspaceLayout = {
  panels: DEFAULT_WORKSPACE_LAYOUT,
  blocks: DEFAULT_WORKSPACE_BLOCKS,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(n) || min, min), max);
}

/** Every playbook uses the full default panel set until customised, so a null/empty stored
 * layout always resolves to "everything on" -- never a blank workspace by accident.
 * Layouts saved before the grid existed keep their panel list and get default geometry. */
export function resolveWorkspaceLayout(stored: unknown): WorkspaceLayout {
  const raw = stored as Partial<WorkspaceLayout> | null;
  const storedPanels = Array.isArray(raw?.panels) && raw!.panels!.length
    ? (raw!.panels as WorkspacePanelKey[])
    : DEFAULT_WORKSPACE_LAYOUT;
  // Panels introduced after this template was saved default to on.
  const panels = [...storedPanels, ...BACKFILLED_PANELS.filter((k) => !storedPanels.includes(k))];


  const storedBlocks = Array.isArray(raw?.blocks) ? (raw!.blocks as WorkspaceBlock[]) : [];
  const blocks: WorkspaceBlock[] = DEFAULT_WORKSPACE_BLOCKS.map((def) => {
    const b = storedBlocks.find((x) => x?.key === def.key);
    if (!b) return def;
    const colSpan = clamp(b.colSpan ?? def.colSpan, 1, GRID_COLS);
    const rowSpan = clamp(b.rowSpan ?? def.rowSpan, 1, GRID_ROWS);
    return {
      key: def.key,
      colSpan,
      rowSpan,
      col: clamp(b.col ?? def.col, 1, GRID_COLS - colSpan + 1),
      row: clamp(b.row ?? def.row, 1, GRID_ROWS - rowSpan + 1),
    };
  });

  return { panels, blocks };
}

export async function fetchToolkitWorkspaceLayout(toolkitId: string | null): Promise<WorkspaceLayout> {
  if (!toolkitId) return DEFAULT_LAYOUT;
  const { data, error } = await (supabase.from("toolkits" as any) as any)
    .select("workspace_layout")
    .eq("id", toolkitId)
    .maybeSingle();
  if (error) throw error;
  return resolveWorkspaceLayout(data?.workspace_layout);
}

export async function saveToolkitWorkspaceLayout(
  toolkitId: string,
  panels: WorkspacePanelKey[],
  blocks: WorkspaceBlock[],
): Promise<void> {
  const { error } = await (supabase.from("toolkits" as any) as any)
    .update({ workspace_layout: { panels, blocks } })
    .eq("id", toolkitId);
  if (error) throw error;
}
