import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, Table as TableIcon } from "lucide-react";

export type ViewMode = "list" | "card" | "sheet";

/** Persists the chosen view (list/card/sheet) per screen in localStorage, defaulting to list. */
export function useViewMode(storageKey: string): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = window.localStorage.getItem(`view-mode:${storageKey}`);
    if (stored === "list" || stored === "card" || stored === "sheet") setMode(stored as ViewMode);
  }, [storageKey]);

  const update = (v: ViewMode) => {
    setMode(v);
    window.localStorage.setItem(`view-mode:${storageKey}`, v);
  };

  return [mode, update];
}

export function ViewToggle({ mode, onChange, allowSheet }: { mode: ViewMode; onChange: (v: ViewMode) => void; allowSheet?: boolean }) {
  return (
    <div className="inline-flex rounded-md border border-input overflow-hidden">
      <Button type="button" size="icon" variant={mode === "list" ? "secondary" : "ghost"} className="h-9 w-9 rounded-none" title="List view" onClick={() => onChange("list")}>
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant={mode === "card" ? "secondary" : "ghost"} className="h-9 w-9 rounded-none border-l border-input" title="Card view" onClick={() => onChange("card")}>
        <LayoutGrid className="h-4 w-4" />
      </Button>
      {allowSheet && (
        <Button type="button" size="icon" variant={mode === "sheet" ? "secondary" : "ghost"} className="h-9 w-9 rounded-none border-l border-input" title="Datasheet view" onClick={() => onChange("sheet")}>
          <TableIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

