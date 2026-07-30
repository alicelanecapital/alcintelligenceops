import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listToolkits, type Toolkit } from "@/lib/toolkits";
import { ShieldCheck } from "lucide-react";

export function PlaybookPickerDialog({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (toolkit: Toolkit) => void;
}) {
  const toolkits = useQuery({ queryKey: ["toolkits"], queryFn: listToolkits, enabled: open });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Choose a playbook</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {(toolkits.data ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="w-full text-left border border-border rounded-lg p-4 hover:border-primary hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2 font-serif text-lg">
                <ShieldCheck className="h-4 w-4 text-primary" /> {t.name}
              </div>
              {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
              {t.kind === "due_diligence" && (
                <div className="text-[11px] text-muted-foreground mt-2 italic">Selecting this moves the record straight to the Deal Pipeline.</div>
              )}
            </button>
          ))}
          {toolkits.isSuccess && !toolkits.data?.length && (
            <div className="text-sm text-muted-foreground text-center py-6">No playbooks yet — add one under Admin → Playbooks.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
