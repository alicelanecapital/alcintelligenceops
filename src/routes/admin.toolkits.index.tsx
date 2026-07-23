import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listToolkits, createToolkit, updateToolkit, deleteToolkit, type Toolkit } from "@/lib/toolkits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/toolkits/")({
  component: () => <AppShell><ToolkitsAdmin /></AppShell>,
  head: () => ({
    meta: [
      { title: "Playbooks · Alice Lane" },
      { name: "description", content: "Design and manage step-wizard playbooks for interviews, meetings and any Alice Lane process." },
    ],
  }),
});

function ToolkitsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits });

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Playbooks"
        description="Create step-wizard playbooks for interviews, meetings or any repeatable process. Each playbook becomes a guided workflow with rounds, questions and required documents."
        actions={<NewToolkitButton />}
      />

      <div className="mt-6 border-t border-border">
        {(q.data ?? []).map((t) => (
          <ToolkitRow
            key={t.id}
            t={t}
            onDelete={async () => {
              try { await deleteToolkit(t.id); toast.success("Playbook deleted"); qc.invalidateQueries({ queryKey: ["toolkits"] }); }
              catch (e: any) { toast.error(e.message ?? "Failed to delete"); }
            }}
            onRename={async (name, description) => {
              try { await updateToolkit(t.id, { name, description }); toast.success("Playbook updated"); qc.invalidateQueries({ queryKey: ["toolkits"] }); }
              catch (e: any) { toast.error(e.message ?? "Failed to update"); }
            }}
          />
        ))}
        {q.isSuccess && !(q.data ?? []).length && (
          <div className="p-12 text-center">
            <div className="font-serif text-xl">No playbooks yet</div>
            <p className="text-sm text-muted-foreground mt-2">Create your first playbook to start building a guided workflow.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolkitRow({ t, onDelete, onRename }: { t: Toolkit; onDelete: () => void; onRename: (name: string, description: string) => void }) {
  const isDD = t.kind === "due_diligence";
  const designHref = isDD ? "/admin/dd-framework" : `/admin/toolkits/${t.id}`;
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-border">
      <div className="h-8 w-8 rounded-md bg-green-100 text-green-800 flex items-center justify-center shrink-0">
        <ShieldCheck className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-base leading-tight truncate">
          {isDD ? `${t.name} (Playbook Template)` : t.name}
          {isDD && <Badge variant="outline" className="ml-2 text-[10px] border-green-700 text-green-800">Template</Badge>}
        </div>
        {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
      </div>
      <Link to={designHref}>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1">
          Design <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
      <EditToolkitButton t={t} onRename={onRename} />
      {!isDD && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete playbook">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this playbook?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes "{t.name}" and its designer content. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function NewToolkitButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mut = useMutation({
    mutationFn: () => createToolkit({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["toolkits"] });
      toast.success("Playbook created");
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create playbook"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> New playbook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New playbook</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Founder discovery interview" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="What is this playbook for?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !name.trim()}>
            {mut.isPending ? "Creating…" : "Create playbook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditToolkitButton({ t, onRename }: { t: Toolkit; onRename: (name: string, description: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(t.name);
  const [description, setDescription] = useState(t.description ?? "");
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setName(t.name); setDescription(t.description ?? ""); } }}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit playbook">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">Edit playbook</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onRename(name.trim(), description.trim()); setOpen(false); }} disabled={!name.trim()}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
