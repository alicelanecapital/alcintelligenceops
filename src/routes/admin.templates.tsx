import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTemplates, fetchTemplateDetail, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
  uploadTemplateAttachment, uploadTemplateLogo, replaceSections,
  createSection, updateSection, deleteSection, reorderSections,
  type ReportTemplate, type ReportTemplateSection,
} from "@/lib/report-templates";
import { extractHeadingsFromAttachment, type ExtractedHeading } from "@/lib/extract-template-headings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SortableTemplateSections } from "@/components/SortableTemplateSections";
import { RegenerateSectionsDialog } from "@/components/RegenerateSectionsDialog";
import { Plus, Trash2, Paperclip, Upload, FileText, WandSparkles, Image as ImageIcon, Pencil, Copy } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/templates")({ component: () => <AppShell><TemplatesAdmin /></AppShell> });

function TemplatesAdmin() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const templates = useQuery({ queryKey: ["report-templates"], queryFn: fetchTemplates });
  const detail = useQuery({
    queryKey: ["report-template", selectedId],
    queryFn: () => fetchTemplateDetail(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!selectedId && templates.data?.length) setSelectedId(templates.data[0].id);
  }, [selectedId, templates.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["report-templates"] });
    qc.invalidateQueries({ queryKey: ["report-template", selectedId] });
  };

  const addTemplateMut = useMutation({
    mutationFn: () => createTemplate("New Template"),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["report-templates"] });
      setSelectedId(t.id);
      toast.success("Template added");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add template"),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["report-templates"] });
      if (selectedId === id) setSelectedId(null);
      toast.success("Template deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete template"),
  });

  const duplicateTemplateMut = useMutation({
    mutationFn: (id: string) => duplicateTemplate(id),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["report-templates"] });
      setSelectedId(t.id);
      toast.success("Template duplicated with all its sections");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to duplicate template"),
  });

  const renameTemplateMut = useMutation({
    mutationFn: () => updateTemplate(renaming!.id, { name: renameValue.trim() }),
    onSuccess: () => {
      invalidate();
      setRenaming(null);
      toast.success("Template renamed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to rename template"),
  });

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Templates"
        description="Board-report layouts used when generating an IC Report — one set of sections per brand, drag to reorder."
      />

      <div className="grid grid-cols-[220px_1fr] gap-6 items-start mt-6">
        <aside className="sticky top-4 shrink-0 space-y-1.5">
          {(templates.data ?? []).map((t) => (
            <div key={t.id} className="group flex items-center gap-1">
              <button
                onClick={() => setSelectedId(t.id)}
                className={`flex-1 min-w-0 text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                  t.id === selectedId ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                }`}
              >
                {t.name}
              </button>
              <button
                type="button"
                title="Rename template"
                className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                onClick={() => { setRenaming({ id: t.id }); setRenameValue(t.name); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Duplicate template with its sections"
                className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground disabled:opacity-40"
                disabled={duplicateTemplateMut.isPending}
                onClick={() => duplicateTemplateMut.mutate(t.id)}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => addTemplateMut.mutate()} disabled={addTemplateMut.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Template
          </Button>
        </aside>

        <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rename template</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input id="tpl-name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
              <Button disabled={!renameValue.trim() || renameTemplateMut.isPending} onClick={() => renameTemplateMut.mutate()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <div className="min-w-0">
          {detail.data && (
            <TemplateDetail
              template={detail.data.template}
              sections={detail.data.sections}
              onChanged={invalidate}
              onDeleteTemplate={() => deleteTemplateMut.mutate(detail.data!.template.id)}
            />
          )}
          {templates.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              Failed to load templates: {(templates.error as Error).message}
            </div>
          )}
          {templates.isSuccess && !selectedId && (templates.data?.length ?? 0) === 0 && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
              <div className="font-serif text-xl">No Templates Yet</div>
              <p className="text-sm text-muted-foreground mt-2">Add a template to define a board-report layout.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateDetail({ template, sections, onChanged, onDeleteTemplate }: {
  template: ReportTemplate; sections: ReportTemplateSection[]; onChanged: () => void; onDeleteTemplate: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [coverBg, setCoverBg] = useState(template.cover_bg ?? "");
  const [coverFg, setCoverFg] = useState(template.cover_fg ?? "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [detectedHeadings, setDetectedHeadings] = useState<ExtractedHeading[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    setName(template.name);
    setDescription(template.description ?? "");
    setCoverBg(template.cover_bg ?? "");
    setCoverFg(template.cover_fg ?? "");
  }, [template]);

  const saveMetaMut = useMutation({
    mutationFn: () => updateTemplate(template.id, { name, description, cover_bg: coverBg || null, cover_fg: coverFg || null }),
    onSuccess: () => { toast.success("Template saved"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save template"),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadTemplateAttachment(template.id, file),
    onSuccess: () => { toast.success("Sample attachment uploaded"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to upload attachment"),
    onSettled: () => setUploading(false),
  });

  const uploadLogoMut = useMutation({
    mutationFn: (file: File) => uploadTemplateLogo(template.id, file),
    onSuccess: () => { toast.success("Logo uploaded"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to upload logo"),
    onSettled: () => setUploadingLogo(false),
  });

  async function runExtraction() {
    if (!template.sample_attachment_url || !template.sample_attachment_name) {
      toast.error("Upload a .docx or .pdf sample attachment first");
      return;
    }
    setExtracting(true);
    try {
      const headings = await extractHeadingsFromAttachment(template.sample_attachment_url, template.sample_attachment_name);
      if (!headings.length) {
        toast.error("Couldn't detect any headings in that attachment");
        return;
      }
      setDetectedHeadings(headings);
      setWizardOpen(true);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to read the attachment");
    } finally {
      setExtracting(false);
    }
  }

  const applySectionsMut = useMutation({
    mutationFn: (sections: { title: string; level: 1 | 2 | 3 }[]) => replaceSections(template.id, sections),
    onSuccess: () => {
      toast.success("Sections regenerated");
      onChanged();
      setWizardOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to apply sections"),
  });

  const addSectionMut = useMutation({
    mutationFn: () => createSection(template.id, sections.length + 1),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to add section"),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateSection(id, { title }),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to rename section"),
  });

  const levelMut = useMutation({
    mutationFn: ({ id, level }: { id: string; level: 1 | 2 | 3 }) => updateSection(id, { level }),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to change section level"),
  });

  const deleteSectionMut = useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => { toast.success("Section removed"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove section"),
  });

  const reorderMut = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) => reorderSections(items),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(e.message ?? "Failed to reorder sections"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-serif text-xl">Template Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="e.g. Board-ready layout for First Serve Ventures" />
          </div>

          <div>
            <Label className="text-sm">Cover Colours</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">Optional — leave blank for the default light cover. Set both to brand the cover page (e.g. a dark navy cover with white text).</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Background
                <input type="color" value={coverBg || "#ffffff"} onChange={(e) => setCoverBg(e.target.value)} className="h-8 w-10 rounded border border-input cursor-pointer" />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Text
                <input type="color" value={coverFg || "#000000"} onChange={(e) => setCoverFg(e.target.value)} className="h-8 w-10 rounded border border-input cursor-pointer" />
              </label>
              {(coverBg || coverFg) && (
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => { setCoverBg(""); setCoverFg(""); }}>
                  Reset to default
                </button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm">Sample Attachment</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Attach a past deck, logo, or brand style sheet — used as the visual reference when this template's styling is applied to a generated report.
            </p>
            {template.sample_attachment_url ? (
              <a
                href={template.sample_attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Paperclip className="h-3.5 w-3.5" /> {template.sample_attachment_name ?? "View attachment"}
              </a>
            ) : (
              <div className="text-xs text-muted-foreground italic">No sample attached yet.</div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? "Uploading…" : template.sample_attachment_url ? "Replace" : "Upload"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setUploading(true); uploadMut.mutate(f); }
                  e.target.value = "";
                }}
              />
              {template.sample_attachment_url && (
                <Button
                  size="sm"
                  variant="outline"
                  title="Regenerate sections from this attachment's heading styles"
                  onClick={runExtraction}
                  disabled={extracting}
                >
                  <WandSparkles className="h-3.5 w-3.5 mr-1" /> {extracting ? "Reading…" : "Regenerate Sections"}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm">Cover Logo</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Rendered directly on the assembled report's cover page (top-left, above the title).
            </p>
            {template.logo_url && (
              <img src={template.logo_url} alt="Template logo" className="h-10 mb-2 object-contain" style={template.cover_bg ? { background: template.cover_bg, padding: 4, borderRadius: 4 } : undefined} />
            )}
            <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
              <ImageIcon className="h-3.5 w-3.5 mr-1" /> {uploadingLogo ? "Uploading…" : template.logo_url ? "Replace" : "Upload"}
            </Button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setUploadingLogo(true); uploadLogoMut.mutate(f); }
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Template
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{template.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently deletes this template and its sections. This can't be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteTemplate}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" onClick={() => saveMetaMut.mutate()} disabled={saveMetaMut.isPending}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-2xl flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Sections</h2>
          <Button size="sm" onClick={() => addSectionMut.mutate()} disabled={addSectionMut.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        <SortableTemplateSections
          sections={sections}
          onReorder={(newOrder) => reorderMut.mutate(newOrder.map((s, i) => ({ id: s.id, sort_order: i + 1 })))}
          onRename={(id, title) => renameMut.mutate({ id, title })}
          onDelete={(id) => deleteSectionMut.mutate(id)}
          onLevelChange={(id, level) => levelMut.mutate({ id, level })}
        />
        {!sections.length && <div className="text-sm text-muted-foreground italic mt-2">No sections yet — add one to start building this layout.</div>}
      </div>

      <RegenerateSectionsDialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        headings={detectedHeadings}
        applying={applySectionsMut.isPending}
        onApply={(sects) => applySectionsMut.mutate(sects)}
      />
    </div>
  );
}
