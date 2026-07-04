import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReactNode } from "react";

export interface CrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: Record<string, any>) => Promise<void>;
  onDelete?: () => Promise<void>;
  title: string;
  mode: "create" | "edit" | "view";
  fields: CrudField[];
  initialData?: Record<string, any>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export interface CrudField {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function CrudModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  title,
  mode,
  fields,
  initialData = {},
  isSaving = false,
  isDeleting = false,
}: CrudModalProps) {
  const [formData, setFormData] = React.useState<Record<string, any>>(initialData);

  React.useEffect(() => {
    setFormData(initialData);
  }, [initialData, isOpen]);

  const handleSave = async () => {
    await onSave(formData);
    onClose();
  };

  const isReadOnly = mode === "view";
  const showDeleteButton = mode === "edit" && onDelete;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {fields.map(field => (
            <div key={field.name}>
              <label className="text-sm font-medium">{field.label}</label>
              {field.type === "textarea" ? (
                <Textarea
                  value={formData[field.name] ?? ""}
                  onChange={e => setFormData(s => ({ ...s, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  disabled={isReadOnly}
                  rows={3}
                />
              ) : field.type === "select" ? (
                <select
                  value={formData[field.name] ?? ""}
                  onChange={e => setFormData(s => ({ ...s, [field.name]: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type}
                  value={formData[field.name] ?? ""}
                  onChange={e => setFormData(s => ({ ...s, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  disabled={isReadOnly}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="flex justify-between">
          <div>
            {showDeleteButton && (
              <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export React for use in the component
import React from "react";
