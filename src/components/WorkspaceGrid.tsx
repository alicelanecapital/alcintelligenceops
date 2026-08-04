import type { ReactNode } from "react";
import { GRID_COLS, type WorkspaceLayout, type WorkspacePanelKey } from "@/lib/workspace-layouts";

/** The Live Workspace canvas: a 6-column grid whose rows size to their content.
 * Panel positions come from the playbook's saved layout (Admin > Workspaces). */
export function WorkspaceGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="gap-4"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(0, auto)",
      }}
    >
      {children}
    </div>
  );
}

export function GridBlock({
  panelKey, layout, className, children,
}: {
  panelKey: WorkspacePanelKey;
  layout: WorkspaceLayout;
  className?: string;
  children: ReactNode;
}) {
  if (!layout.panels.includes(panelKey)) return null;
  const b = layout.blocks.find((x) => x.key === panelKey);
  return (
    <div
      className={className}
      style={b ? { gridColumn: `${b.col} / span ${b.colSpan}`, gridRow: `${b.row} / span ${b.rowSpan}` } : undefined}
    >
      {children}
    </div>
  );
}
