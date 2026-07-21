import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DD_CHECKLIST_DEFAULT, buildDefaultRequestEmail } from "@/lib/dd-checklist";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendRequestInfoEmail } from "@/lib/email.functions";
import { createOpportunityFromContact } from "@/lib/contacts.functions";
import { Mail } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  /** Called with the created opportunity after the email is sent successfully. */
  onOpportunityCreated?: (opp: any) => void;
}

export function RequestInfoModal({ open, onClose, contactId, contactName, contactEmail, onOpportunityCreated }: Props) {
  const initial = buildDefaultRequestEmail(contactName);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(DD_CHECKLIST_DEFAULT.map((item) => [item, true])),
  );
  const [sending, setSending] = useState(false);

  const sendFn = useServerFn(sendRequestInfoEmail);
  const createOppFn = useServerFn(createOpportunityFromContact);

  const selectedItems = DD_CHECKLIST_DEFAULT.filter((i) => checked[i]);
  const fullBody = `${body}\n\nRequested items:\n${selectedItems.map((i) => `  • ${i}`).join("\n")}`;

  const saveDraft = async () => {
    const rows = selectedItems.map((doc_type) => ({
      interview_id: null as any,
      doc_type,
      reason: `Requested from contact ${contactId}`,
    }));
    if (rows.length) {
      const { error } = await supabase.from("document_requests").insert(rows as any);
      if (error) { toast.error(`Failed to save draft: ${error.message}`); return; }
    }
    toast.success("Draft saved");
    onClose();
  };

  const sendEmail = async () => {
    if (!contactEmail) { toast.error("This contact has no email address"); return; }
    setSending(true);
    try {
      const result: any = await sendFn({ data: { to: contactEmail, subject, body: fullBody, contactId } });
      if (!result?.sent) {
        toast.error(result?.reason ?? "Email could not be sent");
        return;
      }
      toast.success("Email sent");

      // Persist the checklist as document requests
      const rows = selectedItems.map((doc_type) => ({
        interview_id: null as any, doc_type, reason: `Requested from contact ${contactId}`,
      }));
      if (rows.length) { await supabase.from("document_requests").insert(rows as any); }

      // Auto-create opportunity now that the outreach has gone out
      try {
        const opp: any = await createOppFn({ data: { contactId } });
        onOpportunityCreated?.(opp);
      } catch (e: any) {
        toast.error(e.message ?? "Could not link opportunity");
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Information — {contactName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input value={contactEmail ?? ""} disabled placeholder="No email on file" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
            <p className="text-[11px] text-muted-foreground mt-1">Your email signature (set in Accounts) is appended automatically.</p>
          </div>
          <div>
            <Label className="mb-2 block">Requested items</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-muted/30">
              {DD_CHECKLIST_DEFAULT.map((item) => (
                <label key={item} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={!!checked[item]}
                    onCheckedChange={(v) => setChecked((s) => ({ ...s, [item]: !!v }))}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={saveDraft}>Save draft</Button>
          <Button onClick={sendEmail} disabled={!contactEmail || sending}>
            <Mail className="h-4 w-4 mr-1" /> {sending ? "Sending…" : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
