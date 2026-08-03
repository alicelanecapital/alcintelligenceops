import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listContactCategoryOptions, createContactCategory } from "@/lib/contact-categories";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const NEW_VALUE = "__new__";

/** Category dropdown backed by the contact_categories table -- lets anyone add a brand
 * new category on the spot (e.g. "Key Advisor"), which then persists and is offered to
 * everyone from then on, instead of being limited to the original fixed list. */
export function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const qc = useQueryClient();
  const categories = useQuery({ queryKey: ["contact-categories"], queryFn: listContactCategoryOptions });
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddNew() {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const created = await createContactCategory(newLabel);
      qc.invalidateQueries({ queryKey: ["contact-categories"] });
      onChange(created.value);
      setAddingNew(false);
      setNewLabel("");
      toast.success(`Added category "${created.label}"`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  if (addingNew) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New category name"
          className="h-9"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddNew(); } if (e.key === "Escape") setAddingNew(false); }}
        />
        <button
          type="button"
          onClick={handleAddNew}
          disabled={saving || !newLabel.trim()}
          className="text-xs text-primary hover:underline shrink-0 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={() => setAddingNew(false)} className="text-xs text-muted-foreground hover:text-foreground shrink-0">Cancel</button>
      </div>
    );
  }

  return (
    <select
      className="w-full h-9 px-3 border rounded-md text-sm bg-background"
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW_VALUE) setAddingNew(true);
        else onChange(e.target.value);
      }}
    >
      {(categories.data ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      <option value={NEW_VALUE}>+ Add new category…</option>
    </select>
  );
}
