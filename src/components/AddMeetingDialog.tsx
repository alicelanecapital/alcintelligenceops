import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fetchContacts } from "@/lib/contacts";
import { listToolkits } from "@/lib/toolkits";
import { startMeetingForContact, createOpportunityFromContact } from "@/lib/contacts.functions";
import { toast } from "sonner";

/** Ad-hoc meeting creation: a founder meeting can happen with no prior calendar event
 * (e.g. someone drops in). Pick who it's with and which playbook to run, then jump
 * straight into the workspace -- or, for the Due Diligence playbook, straight into the
 * Deal Pipeline Room, same as choosing Due Diligence used to do from a scheduled row. */
export function AddMeetingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const [contactId, setContactId] = useState("");
  const [playbookId, setPlaybookId] = useState("");
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => fetchContacts(), enabled: open });
  const toolkits = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits, enabled: open });
  const startMeeting = useServerFn(startMeetingForContact);
  const createOpp = useServerFn(createOpportunityFromContact);

  const submit = useMutation({
    mutationFn: async () => {
      const toolkit = (toolkits.data ?? []).find((t) => t.id === playbookId);
      const interview = await startMeeting({ data: { contactId, playbookId: playbookId || undefined } });
      if (toolkit?.kind === "due_diligence") {
        const opp = await createOpp({ data: { contactId } });
        return { to: "dd" as const, opportunityId: (opp as any).id };
      }
      return { to: "workspace" as const, interviewId: (interview as any).id };
    },
    onSuccess: (result) => {
      onOpenChange(false);
      setContactId(""); setPlaybookId("");
      if (result.to === "dd") {
        toast.success("Moved to Deal Pipeline");
        nav({ to: "/dd-interview/$opportunityId/$round", params: { opportunityId: result.opportunityId, round: "1" } });
      } else {
        toast.success("Meeting started");
        nav({ to: "/interviews/$id", params: { id: result.interviewId } });
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to start meeting"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New meeting</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Who is this with?</Label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Choose a contact…</option>
              {(contacts.data ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Playbook</Label>
            <select
              value={playbookId}
              onChange={(e) => setPlaybookId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No playbook (freeform)</option>
              {(toolkits.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {(toolkits.data ?? []).find((t) => t.id === playbookId)?.kind === "due_diligence" && (
              <p className="text-[11px] text-muted-foreground mt-1 italic">Selecting this moves the record straight to the Deal Pipeline.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !contactId}>
            {submit.isPending ? "Starting…" : "Start meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
