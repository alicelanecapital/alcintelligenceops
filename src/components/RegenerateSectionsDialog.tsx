import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { ExtractedHeading } from "@/lib/extract-template-headings";

type DraftRow = ExtractedHeading & { include: boolean };

const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: "Section", 2: "Subsection", 3: "Sub-subsection" };
const LEVEL_INDENT: Record<1 | 2 | 3, string> = { 1: "ml-0", 2: "ml-6", 3: "ml-12" };

/** Preview step for the "regenerate sections from attachment" wizard -- shows every
 * heading it detected so the user can drop stray lines and fix mis-levelled ones before
 * committing, rather than trusting the heuristic blindly. */
export function RegenerateSectionsDialog({ open, onClose, headings, onApply, applying }: {
  open: boolean;
  onClose: () => void;
  headings: ExtractedHeading[];
  onApply: (sections: { title: string; level: 1 | 2 | 3 }[]) => void;
  applying: boolean;
}) {
  const [rows, setRows] = useState<DraftRow[]>([]);

  // Reset the draft whenever a fresh extraction comes in.
  useEffect(() => {
    if (open) setRows(headings.map((h) => ({ ...h, include: true })));
  }, [open, headings]);

  function update(i: number, patch: Partial<DraftRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function changeLevel(i: number, dir: -1 | 1) {
    setRows((r) => r.map((row, idx) => {
      if (idx !== i) return row;
      const next = Math.min(3, Math.max(1, row.level + dir)) as 1 | 2 | 3;
      return { ...row, level: next };
    }));
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setRows([]); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detected Sections</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Detected from heading styles in the attachment. Uncheck or delete anything that isn't really a heading, fix levels with the arrows, then apply — this replaces the template's current section list.
        </p>
        <div className="max-h-[50vh] overflow-y-auto space-y-1.5 border rounded-md p-2">
          {rows.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No headings detected.</div>}
          {rows.map((row, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border border-border ${LEVEL_INDENT[row.level]} ${!row.include ? "opacity-40" : ""}`}>
              <Checkbox checked={row.include} onCheckedChange={(v) => update(i, { include: !!v })} />
              <div className="flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={row.level <= 1} onClick={() => changeLevel(i, -1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={row.level >= 3} onClick={() => changeLevel(i, 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-24 shrink-0">{LEVEL_LABEL[row.level]}</span>
              <Input value={row.title} onChange={(e) => update(i, { title: e.target.value })} className="h-8 text-sm flex-1" disabled={!row.include} />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" title="Remove this row" onClick={() => removeRow(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setRows([]); }}>Cancel</Button>
          <Button
            onClick={() => onApply(rows.filter((r) => r.include).map(({ title, level }) => ({ title, level })))}
            disabled={applying || includedCount === 0}
          >
            {applying ? "Applying…" : `Apply ${includedCount} Section${includedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
