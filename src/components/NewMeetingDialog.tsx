import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchFounders } from "@/lib/db";
import { startInterview } from "@/lib/interviews.functions";
import { startMeetingForContact } from "@/lib/contacts.functions";

export type NewMeetingDefaults = {
  contactId?: string;
  founderName?: string;
  businessName?: string;
  industry?: string;
};


export function NewMeetingDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaults?: NewMeetingDefaults;
}) {
  const nav = useNavigate();
  const [founderId, setFounderId] = useState<string>("");
  const [founderName, setFounderName] = useState(defaults?.founderName ?? "");
  const [businessName, setBusinessName] = useState(defaults?.businessName ?? "");
  const [industry, setIndustry] = useState(defaults?.industry ?? "");
  const [busy, setBusy] = useState(false);
  const founders = useQuery({ queryKey: ["founders"], queryFn: fetchFounders, enabled: open });

  useEffect(() => {
    if (open) {
      setFounderId("");
      setFounderName(defaults?.founderName ?? "");
      setBusinessName(defaults?.businessName ?? "");
      setIndustry(defaults?.industry ?? "");
    }
  }, [open, defaults?.founderName, defaults?.businessName, defaults?.industry]);

  async function submit() {
    setBusy(true);
    try {
      const row = defaults?.contactId
        ? await startMeetingForContact({ data: { contactId: defaults.contactId } })
        : await startInterview({
            data: {
              founderId: founderId || undefined,
              founderName: founderName || undefined,
              businessName: businessName || undefined,
              industry: industry || undefined,
            },
          });
      toast.success("Meeting started");
      onOpenChange(false);
      nav({ to: "/interviews/$id", params: { id: (row as any).id } });

    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New founder meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Existing founder (optional)</Label>
            <select
              value={founderId}
              onChange={(e) => {
                setFounderId(e.target.value);
                const f = (founders.data ?? []).find((x: any) => x.id === e.target.value);
                if (f) {
                  setFounderName(f.name);
                  setBusinessName(f.startup_name ?? "");
                  setIndustry(f.sector ?? "");
                }
              }}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Start blank —</option>
              {(founders.data ?? []).map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.startup_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Founder name</Label>
            <Input value={founderName} onChange={(e) => setFounderName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Business</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (!founderId && !founderName)}>
            {busy ? "Generating brief…" : "Create & open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
