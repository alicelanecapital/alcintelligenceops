import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchEvents, createEvent } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ADD_NEW = "__add_new__";

export function EventSelect({
  value,
  onChange,
  placeholder = "— none —",
}: {
  value: string | null | undefined;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const sorted = useMemo(
    () => [...(events.data ?? [])].sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? "")),
    [events.data],
  );
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");

  const create = useMutation({
    mutationFn: () => createEvent({ name, start_date: startDate || null }),
    onSuccess: (row: any) => {
      toast.success("Event added");
      qc.invalidateQueries({ queryKey: ["events"] });
      setAddOpen(false);
      setName("");
      setStartDate("");
      onChange(row.id);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add event"),
  });

  return (
    <>
      <select
        className="w-full h-9 px-3 border rounded-md text-sm bg-background"
        value={value ?? ""}
        onChange={(e) => {
          if (e.target.value === ADD_NEW) {
            setAddOpen(true);
            return;
          }
          onChange(e.target.value);
        }}
      >
        <option value="">{placeholder}</option>
        {sorted.map((ev: any) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
          </option>
        ))}
        <option value={ADD_NEW}>+ Add new event…</option>
      </select>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add new event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Name</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SA VC Summit 2026"
              />
            </div>
            <div>
              <Label className="text-sm">Date (optional)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              {create.isPending ? "Saving…" : "Add event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
