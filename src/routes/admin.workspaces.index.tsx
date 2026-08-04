import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listToolkits } from "@/lib/toolkits";
import {
  WORKSPACE_PANELS, DEFAULT_WORKSPACE_LAYOUT, fetchToolkitWorkspaceLayout, saveToolkitWorkspaceLayout,
  type WorkspacePanelKey,
} from "@/lib/workspace-layouts";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/workspaces/")({
  component: () => <AppShell><WorkspacesAdmin /></AppShell>,
  head: () => ({
    meta: [
      { title: "Workspaces · Alice Lane" },
      { name: "description", content: "Design which panels each playbook's Live Workspace shows, and where." },
    ],
  }),
});

function WorkspacesAdmin() {
  const toolkits = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits });
  const [toolkitId, setToolkitId] = useState<string>("");

  useEffect(() => {
    if (!toolkitId && toolkits.data?.length) setToolkitId(toolkits.data[0].id);
  }, [toolkits.data, toolkitId]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Workspaces"
        description="Choose a playbook to see and customise the panels its Live Workspace shows during a meeting. Every playbook uses the same default layout until you turn panels off here."
      />

      <div className="mt-6 max-w-sm">
        <Select value={toolkitId} onValueChange={setToolkitId}>
          <SelectTrigger><SelectValue placeholder="Select a playbook…" /></SelectTrigger>
          <SelectContent>
            {(toolkits.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {toolkitId && <WorkspaceLayoutEditor key={toolkitId} toolkitId={toolkitId} />}
    </div>
  );
}

function WorkspaceLayoutEditor({ toolkitId }: { toolkitId: string }) {
  const qc = useQueryClient();
  const layout = useQuery({ queryKey: ["workspace-layout", toolkitId], queryFn: () => fetchToolkitWorkspaceLayout(toolkitId) });
  const [panels, setPanels] = useState<WorkspacePanelKey[]>(DEFAULT_WORKSPACE_LAYOUT);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (layout.data) { setPanels(layout.data.panels); setDirty(false); }
  }, [layout.data]);

  const saveMut = useMutation({
    mutationFn: () => saveToolkitWorkspaceLayout(toolkitId, panels),
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
    setPanels(DEFAULT_WORKSPACE_LAYOUT);
    setDirty(true);
  }

  const byKey = (key: WorkspacePanelKey) => WORKSPACE_PANELS.find((p) => p.key === key)!;
  const on = (key: WorkspacePanelKey) => panels.includes(key);

  const PanelFrame = ({ panelKey }: { panelKey: WorkspacePanelKey }) => {
    const p = byKey(panelKey);
    return (
      <Card className={on(panelKey) ? "" : "opacity-50 border-dashed"}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{p.label}</div>
            <Switch checked={on(panelKey)} onCheckedChange={() => toggle(panelKey)} />
          </div>
          <p className="text-xs text-muted-foreground">{p.description}</p>
        </CardContent>
      </Card>
    );
  };

  if (layout.isLoading) return <div className="mt-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <LayoutGrid className="h-3.5 w-3.5" /> Live Workspace layout preview
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

      {/* Mirrors the real Live Workspace grid: col1 questions / center transcript+scoring /
          col4 risk alerts, then full-width panels below. */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3"><PanelFrame panelKey="questions" /></div>
        <div className="col-span-6 space-y-3">
          <PanelFrame panelKey="transcript" />
          <PanelFrame panelKey="scoring" />
        </div>
        <div className="col-span-3"><PanelFrame panelKey="risk_alerts" /></div>
      </div>
      <PanelFrame panelKey="manual_assessment" />
      <PanelFrame panelKey="stakeholder_brief" />
      <PanelFrame panelKey="report" />

      <div className="pt-2">
        <Badge variant="outline" className="text-[10px]">{panels.length} of {WORKSPACE_PANELS.length} panels enabled</Badge>
      </div>
    </div>
  );
}
