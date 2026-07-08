import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllTasks, createTask, updateTask, deleteTask } from "@/lib/founders-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({ component: () => <AppShell><TaskList /></AppShell> });

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-amber-100 text-amber-800",
  Low: "bg-blue-100 text-blue-800",
};

function TaskList() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"open" | "done" | "all">("open");
  const [addOpen, setAddOpen] = useState(false);
  const q = useQuery({ queryKey: ["all-tasks"], queryFn: fetchAllTasks });

  const filtered = useMemo(() => {
    const all = q.data ?? [];
    if (statusFilter === "open") return all.filter((t: any) => t.status !== "Done");
    if (statusFilter === "done") return all.filter((t: any) => t.status === "Done");
    return all;
  }, [q.data, statusFilter]);

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTask(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-tasks"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to update task"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-tasks"] }); toast.success("Task deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete task"),
  });

  const isOverdue = (t: any) => t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date(new Date().toDateString());

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Planning"
        title="Tasks"
        description="Everything the team needs to follow up on — across founders, companies, and opportunities."
        actions={<AddTaskDialog open={addOpen} onOpenChange={setAddOpen} />}
      />

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.map((t: any) => (
          <Card key={t.id} className={isOverdue(t) ? "border-red-300" : ""}>
            <CardContent className="p-4 flex items-start gap-3">
              <button
                onClick={() => toggleMut.mutate({ id: t.id, status: t.status === "Done" ? "Open" : "Done" })}
                className={`mt-0.5 h-5 w-5 shrink-0 rounded border flex items-center justify-center ${t.status === "Done" ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}
                title={t.status === "Done" ? "Mark as open" : "Mark as done"}
              >
                {t.status === "Done" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`font-medium text-sm ${t.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  {t.priority && <Badge className={`${PRIORITY_COLORS[t.priority] ?? "bg-gray-100 text-gray-800"} border-0 text-[10px]`}>{t.priority}</Badge>}
                  {isOverdue(t) && <Badge className="bg-red-600 text-white border-0 text-[10px]">Overdue</Badge>}
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                <div className="text-[11px] text-muted-foreground mt-1 flex gap-3 flex-wrap">
                  {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                  {t.assignee && <span>Assigned to {t.assignee}</span>}
                  {(t.founder?.name || t.company?.name || t.opportunity?.name) && (
                    <span>Linked: {t.founder?.name ?? t.company?.name ?? t.opportunity?.name}</span>
                  )}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteMut.mutate(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {q.isSuccess && !filtered.length && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No {statusFilter === "all" ? "" : statusFilter} tasks. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function AddTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("Medium");

  const m = useMutation({
    mutationFn: () => createTask({ title, description: description || null, due_date: dueDate || null, assignee: assignee || null, priority, status: "Open" }),
    onSuccess: () => {
      toast.success("Task added");
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      setTitle(""); setDescription(""); setDueDate(""); setAssignee(""); setPriority("Medium");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add task"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Add task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Title*</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Description</Label>
            <textarea className="w-full min-h-[70px] px-3 py-2 border rounded-md text-sm bg-background mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Priority</Label>
              <select className="w-full h-9 px-3 border rounded-md text-sm bg-background mt-1" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-sm">Assignee</Label>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1" placeholder="Team member name" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={!title.trim() || m.isPending}>{m.isPending ? "Adding…" : "Add task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
