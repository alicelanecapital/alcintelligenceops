import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchTemplates } from "@/lib/report-templates";
import { FileText, Paperclip } from "lucide-react";

export function TemplatePickerDialog({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}) {
  const templates = useQuery({ queryKey: ["report-templates"], queryFn: fetchTemplates, enabled: open });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Choose a Report Template</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {(templates.data ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="w-full text-left border border-border rounded-lg p-4 hover:border-primary hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2 font-serif text-lg">
                <FileText className="h-4 w-4 text-primary" /> {t.name}
              </div>
              {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
              {t.sample_attachment_name && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                  <Paperclip className="h-3 w-3" /> Styled from {t.sample_attachment_name}
                </div>
              )}
            </button>
          ))}
          {templates.isSuccess && !templates.data?.length && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No templates yet — add one under Admin → Templates.
            </div>
          )}
          {templates.isError && (
            <div className="text-sm text-destructive text-center py-6">
              Failed to load templates: {(templates.error as Error).message}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
