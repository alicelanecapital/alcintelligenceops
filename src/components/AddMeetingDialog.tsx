import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { fetchContacts, createContact, CATEGORY_OPTIONS } from "@/lib/contacts";
import { listToolkits } from "@/lib/toolkits";
import { startMeetingForContact, createOpportunityFromContact } from "@/lib/contacts.functions";
import { toast } from "sonner";

/** Ad-hoc meeting creation: a founder meeting can happen with no prior calendar event
 * (e.g. someone drops in). Pick who it's with -- an existing contact, or create a brand
 * new one on the spot -- and which playbook to run, then jump straight into the workspace
 * -- or, for the Due Diligence playbook, straight into the Deal Pipeline Room, same as
 * choosing Due Diligence used to do from a scheduled row. */
export function AddMeetingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [contactId, setContactId] = useState("");
  const [playbookId, setPlaybookId] = useState("");
  const [creatingContact, setCreatingContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", company: "", category: "founder" });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => fetchContacts(), enabled: open });
  const toolkits = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits, enabled: open });
  const startMeeting = useServerFn(startMeetingForContact);
  const createOpp = useServerFn(createOpportunityFromContact);

  // Default to Ad Hoc Meeting (most meetings aren't formal DD rounds), falling back to
  // whatever toolkit comes first if that hasn't been seeded. There's no "no playbook"
  // option any more -- every meeting runs against some playbook, even a free-form one.
  useEffect(() => {
    if (playbookId || !toolkits.data?.length) return;
    const adHoc = toolkits.data.find((t) => t.name?.trim().toLowerCase().replace(/\s+/g, "") === "adhocmeeting");
    setPlaybookId((adHoc ?? toolkits.data[0]).id);
  }, [toolkits.data, playbookId]);

  function reset() {
    setContactId(""); setPlaybookId(""); setCreatingContact(false); setNewContact({ name: "", company: "", category: "founder" });
  }

  const submit = useMutation({
    mutationFn: async () => {
      let resolvedContactId = contactId;
      if (creatingContact) {
        if (!newContact.name.trim() && !newContact.company.trim()) throw new Error("Enter a name or company for the new contact");
        const created = await createContact({
          name: newContact.name.trim() || newContact.company.trim(),
          company: newContact.company.trim() || null,
          category: newContact.category,
        } as any);
        resolvedContactId = created.id;
      }
      const toolkit = (toolkits.data ?? []).find((t) => t.id === playbookId);
      const interview = await startMeeting({ data: { contactId: resolvedContactId, playbookId: playbookId || undefined } });
      if (toolkit?.kind === "due_diligence") {
        const opp = await createOpp({ data: { contactId: resolvedContactId } });
        return { to: "dd" as const, opportunityId: (opp as any).id };
      }
      return { to: "workspace" as const, interviewId: (interview as any).id };
    },
    onSuccess: (result) => {
      onOpenChange(false);
      reset();
      qc.invalidateQueries({ queryKey: ["contacts"] });
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

  const canSubmit = creatingContact
    ? !!(newContact.name.trim() || newContact.company.trim())
    : !!contactId;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New meeting</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Who is this with?</Label>
              <button
                type="button"
                onClick={() => { setCreatingContact((v) => !v); setContactId(""); }}
                className="text-xs text-primary hover:underline"
              >
                {creatingContact ? "Choose an existing contact instead" : "+ New contact"}
              </button>
            </div>
            {creatingContact ? (
              <div className="mt-2 space-y-2 border border-border rounded-md p-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={newContact.name} onChange={(e) => setNewContact((f) => ({ ...f, name: e.target.value }))} placeholder="Contact name" />
                </div>
                <div>
                  <Label className="text-xs">Company</Label>
                  <Input value={newContact.company} onChange={(e) => setNewContact((f) => ({ ...f, company: e.target.value }))} placeholder="Company (optional)" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <select
                    value={newContact.category}
                    onChange={(e) => setNewContact((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            ) : (
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
            )}
          </div>
          <div>
            <Label>Playbook</Label>
            <select
              value={playbookId}
              onChange={(e) => setPlaybookId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
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
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !canSubmit}>
            {submit.isPending ? "Starting…" : "Start meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
