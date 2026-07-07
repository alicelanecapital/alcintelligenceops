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
import { Copy, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
}

export function RequestInfoModal({ open, onClose, contactId, contactName, contactEmail }: Props) {
  const initial = buildDefaultRequestEmail(contactName);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(DD_CHECKLIST_DEFAULT.map((item) => [item, true])),
  );

  const selectedItems = DD_CHECKLIST_DEFAULT.filter((i) => checked[i]);
  const fullBody = `${body}\n\nRequested items:\n${selectedItems.map((i) => `  • ${i}`).join("\n")}`;

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${fullBody}`);
    toast.success("Email copied to clipboard");
  };

  const openMail = () => {
    const url = `mailto:${contactEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    window.open(url, "_blank");
  };

  const saveDraft = async () => {
    // Persist as a document_requests row per selected item so the meeting workspace can track them.
    // interview_id may be null; contact_id link stored via reason field for now.
    const rows = selectedItems.map((doc_type) => ({
      interview_id: null as any,
      doc_type,
      reason: `Requested from contact ${contactId}`,
    }));
    if (rows.length) {
      const { error } = await supabase.from("document_requests").insert(rows as any);
      if (error) {
        toast.error(`Failed to save draft: ${error.message}`);
        return;
      }
    }
    toast.success("Draft saved");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Information — {contactName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
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
          <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
          <Button onClick={openMail} disabled={!contactEmail}>
            <Mail className="h-4 w-4 mr-1" /> Open in mail client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
