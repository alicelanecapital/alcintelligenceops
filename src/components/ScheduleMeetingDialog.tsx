import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { ContactRow } from "@/lib/contacts";

function nextWeekdayAt10(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  // skip Sat/Sun
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: "10:00" };
}

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: ContactRow;
}) {
  const qc = useQueryClient();
  const initial = nextWeekdayAt10();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      const n = nextWeekdayAt10();
      setDate(n.date);
      setTime(n.time);
      setNote("");
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      const startedAt = new Date(`${date}T${time}:00`).toISOString();
      const founderName = contact.name ?? contact.company ?? "Contact";
      const businessName = contact.company ?? contact.name ?? "";
      const { error } = await (supabase.from("interviews") as any).insert({
        contact_id: contact.id,
        event_id: (contact as any).source_event_id ?? null,
        title: `${founderName} · ${businessName}`,
        founder_name: founderName,
        business_name: businessName,
        interviewer_name: null,
        status: "scheduled",
        started_at: startedAt,
        meeting_type: "scheduled",
        brief: note ? { summary: note } : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meeting scheduled");
      qc.invalidateQueries({ queryKey: ["interviews"] });
      qc.invalidateQueries({ queryKey: ["contact-meetings", contact.id] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to schedule"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Schedule meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            With <span className="font-medium text-foreground">{contact.name}</span>
            {contact.company ? ` · ${contact.company}` : ""}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" placeholder="Topic or agenda" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !date || !time}>
            {mut.isPending ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
