import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listToolkits, createToolkit, updateToolkit, deleteToolkit, duplicateToolkit, countToolkitUsage } from "@/lib/toolkits";
import {
  WORKSPACE_PANELS, DEFAULT_LAYOUT, GRID_COLS, GRID_ROWS,
  fetchToolkitWorkspaceLayout, saveToolkitWorkspaceLayout,
  type WorkspacePanelKey, type WorkspaceBlock,
} from "@/lib/workspace-layouts";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, RotateCcw, GripVertical, Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/workspaces/")({
  component: () => <AppShell><WorkspacesAdmin /></AppShell>,
  head: () => ({
    meta: [
      { title: "Workspaces · Alice Lane" },
      { name: "description", content: "Design which panels each playbook's Live Workspace shows, and where they sit on the canvas." },
      { property: "og:title", content: "Workspaces · Alice Lane" },
      { property: "og:description", content: "Drag-and-drop designer for each playbook's Live Workspace layout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CELL_H = 56; // editor row height in px
const GAP = 8;

function WorkspacesAdmin() {
  const qc = useQueryClient();
  const toolkits = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits });
  const [toolkitId, setToolkitId] = useState<string>("");
  const [dialog, setDialog] = useState<null | "new" | "rename">(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!toolkitId && toolkits.data?.length) setToolkitId(toolkits.data[0].id);
  }, [toolkits.data, toolkitId]);

  const current = (toolkits.data ?? []).find((t) => t.id === toolkitId) ?? null;

  const createMut = useMutation({
    mutationFn: () => createToolkit({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: async (t) => {
      await qc.invalidateQueries({ queryKey: ["toolkits"] });
      setToolkitId(t.id);
      setDialog(null);
      toast.success("Workspace created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create workspace"),
  });

  const renameMut = useMutation({
    mutationFn: () => updateToolkit(toolkitId, { name: name.trim(), description: description.trim() || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["toolkits"] });
      setDialog(null);
      toast.success("Workspace updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update workspace"),
  });

  const duplicateMut = useMutation({
    mutationFn: () => duplicateToolkit(toolkitId),
    onSuccess: async (t) => {
      await qc.invalidateQueries({ queryKey: ["toolkits"] });
      setToolkitId(t.id);
      toast.success("Workspace duplicated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to duplicate workspace"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const inUse = await countToolkitUsage(toolkitId);
      if (inUse > 0) throw new Error(`${inUse} meeting${inUse === 1 ? "" : "s"} still use this workspace — reassign them first.`);
      await deleteToolkit(toolkitId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["toolkits"] });
      setToolkitId("");
      toast.success("Workspace deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete workspace"),
  });

  function openNew() { setName(""); setDescription(""); setDialog("new"); }
  function openRename() {
    setName(current?.name ?? "");
    setDescription(current?.description ?? "");
    setDialog("rename");
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Workspaces"
        description="Choose a playbook, then drag its panels around the 6 x 10 canvas to design the Live Workspace shown during a meeting. Every playbook uses the same default layout until you change it here."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Workspace</Button>}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-sm">
          <Select value={toolkitId} onValueChange={setToolkitId}>
            <SelectTrigger><SelectValue placeholder="Select a playbook…" /></SelectTrigger>
            <SelectContent>
              {(toolkits.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" disabled={!toolkitId} onClick={openRename}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rename
        </Button>
        <Button variant="outline" size="sm" disabled={!toolkitId || duplicateMut.isPending} onClick={() => duplicateMut.mutate()}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive" disabled={!toolkitId}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes "{current?.name}" and its saved panel layout. Meetings already using it must be
                reassigned first. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {current?.description && <p className="mt-2 text-xs text-muted-foreground">{current.description}</p>}

      {toolkitId && <WorkspaceLayoutEditor key={toolkitId} toolkitId={toolkitId} />}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "new" ? "New workspace" : "Rename workspace"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Name</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Series A Deep Dive" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-desc">Description</Label>
              <Input id="ws-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this workspace is used for" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              disabled={!name.trim() || createMut.isPending || renameMut.isPending}
              onClick={() => (dialog === "new" ? createMut.mutate() : renameMut.mutate())}
            >
              {dialog === "new" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function WorkspaceLayoutEditor({ toolkitId }: { toolkitId: string }) {
  const qc = useQueryClient();
  const layout = useQuery({ queryKey: ["workspace-layout", toolkitId], queryFn: () => fetchToolkitWorkspaceLayout(toolkitId) });
  const [panels, setPanels] = useState<WorkspacePanelKey[]>(DEFAULT_LAYOUT.panels);
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>(DEFAULT_LAYOUT.blocks);
  const [dirty, setDirty] = useState(false);
  const [dragKey, setDragKey] = useState<WorkspacePanelKey | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (layout.data) { setPanels(layout.data.panels); setBlocks(layout.data.blocks); setDirty(false); }
  }, [layout.data]);

  const saveMut = useMutation({
    mutationFn: () => saveToolkitWorkspaceLayout(toolkitId, panels, blocks),
    onSuccess: () => {
      toast.success("Workspace layout saved");
      qc.invalidateQueries({ queryKey: ["workspace-layout", toolkitId] });
      setDirty(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save layout"),
  });

  function toggle(key: WorkspacePanelKey) {
    setPanels((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setDirty(true);
  }
  function resetToDefault() {
    setPanels(DEFAULT_LAYOUT.panels);
    setBlocks(DEFAULT_LAYOUT.blocks);
    setDirty(true);
  }
  function patchBlock(key: WorkspacePanelKey, patch: Partial<WorkspaceBlock>) {
    setBlocks((prev) => prev.map((b) => {
      if (b.key !== key) return b;
      const next = { ...b, ...patch };
      next.colSpan = Math.min(Math.max(next.colSpan, 1), GRID_COLS);
      next.rowSpan = Math.min(Math.max(next.rowSpan, 1), GRID_ROWS);
      next.col = Math.min(Math.max(next.col, 1), GRID_COLS - next.colSpan + 1);
      next.row = Math.min(Math.max(next.row, 1), GRID_ROWS - next.rowSpan + 1);
      return next;
    }));
    setDirty(true);
  }

  function startResize(e: React.MouseEvent, block: WorkspaceBlock) {
    e.preventDefault();
    e.stopPropagation();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cellW = (rect.width - GAP * (GRID_COLS - 1)) / GRID_COLS;
    const startX = e.clientX, startY = e.clientY;
    const startColSpan = block.colSpan, startRowSpan = block.rowSpan;
    const onMove = (ev: MouseEvent) => {
      const dCols = Math.round((ev.clientX - startX) / (cellW + GAP));
      const dRows = Math.round((ev.clientY - startY) / (CELL_H + GAP));
      patchBlock(block.key, { colSpan: startColSpan + dCols, rowSpan: startRowSpan + dRows });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const label = (key: WorkspacePanelKey) => WORKSPACE_PANELS.find((p) => p.key === key)?.label ?? key;
  const enabledBlocks = blocks.filter((b) => panels.includes(b.key));
  const trayPanels = WORKSPACE_PANELS.filter((p) => !panels.includes(p.key));

  if (layout.isLoading) return <div className="mt-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <LayoutGrid className="h-3.5 w-3.5" /> Live Workspace canvas · {GRID_COLS} columns × {GRID_ROWS} rows
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={resetToDefault} disabled={saveMut.isPending}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset To Default
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save Layout"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag a panel onto any cell to move it. Drag the handle in its bottom-right corner to change how many
        columns and rows it spans. Switch a panel off to send it back to the tray below.
      </p>

      <div
        ref={gridRef}
        className="relative rounded-md border border-forest/30 bg-white p-2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_H}px)`,
          gap: `${GAP}px`,
        }}
      >
        {/* Drop-target cells */}
        {Array.from({ length: GRID_ROWS }).flatMap((_, r) =>
          Array.from({ length: GRID_COLS }).map((__, c) => (
            <div
              key={`cell-${r}-${c}`}
              className="rounded border border-dashed border-border/70"
              style={{ gridColumn: c + 1, gridRow: r + 1 }}
              onDragOver={(e) => { if (dragKey) e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragKey) return;
                patchBlock(dragKey, { col: c + 1, row: r + 1 });
                setDragKey(null);
              }}
            />
          )),
        )}

        {/* Panel blocks */}
        {enabledBlocks.map((b) => (
          <div
            key={b.key}
            draggable
            onDragStart={() => setDragKey(b.key)}
            onDragEnd={() => setDragKey(null)}
            className="relative rounded-md border border-forest bg-forest/5 p-2 cursor-grab active:cursor-grabbing overflow-hidden"
            style={{
              gridColumn: `${b.col} / span ${b.colSpan}`,
              gridRow: `${b.row} / span ${b.rowSpan}`,
              zIndex: 2,
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <GripVertical className="h-3.5 w-3.5 text-forest/60 shrink-0" />
                <span className="text-xs font-semibold text-forest truncate">{label(b.key)}</span>
              </div>
              <Switch checked onCheckedChange={() => toggle(b.key)} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{b.colSpan} × {b.rowSpan}</div>
            <div
              onMouseDown={(e) => startResize(e, b)}
              title="Drag to resize"
              className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize bg-forest/70 rounded-tl"
            />
          </div>
        ))}
      </div>

      {trayPanels.length > 0 && (
        <div className="rounded-md border border-dashed border-border p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Available panels (switched off)</div>
          <div className="flex flex-wrap gap-2">
            {trayPanels.map((p) => (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                className="text-xs rounded border border-border px-2 py-1 hover:bg-muted"
                title={p.description}
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-1">
        <Badge variant="outline" className="text-[10px]">{panels.length} of {WORKSPACE_PANELS.length} panels enabled</Badge>
      </div>
    </div>
  );
}
