import { supabase } from "@/integrations/supabase/client";

// report_templates / report_template_sections are new tables (20260731000000_report_templates.sql)
// not yet in the generated Supabase types -- cast until types.ts is regenerated post-migration.
const db = supabase as any;

export type ReportTemplate = {
  id: string;
  name: string;
  description: string | null;
  sample_attachment_url: string | null;
  sample_attachment_name: string | null;
  cover_bg: string | null;
  cover_fg: string | null;
  logo_url: string | null;
  created_at: string;
};

/** level 1 = section (starts a new page), 2 = subsection, 3 = sub-subsection --
 * nesting is implied by level transitions in sort_order, not a parent_id tree. */
export type ReportTemplateSection = {
  id: string;
  template_id: string;
  title: string;
  level: 1 | 2 | 3;
  sort_order: number;
};

export async function fetchTemplates(): Promise<ReportTemplate[]> {
  const { data, error } = await db.from("report_templates").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTemplateDetail(templateId: string) {
  const [{ data: template, error: templateError }, { data: sections, error: sectionsError }] = await Promise.all([
    db.from("report_templates").select("*").eq("id", templateId).single(),
    db.from("report_template_sections").select("*").eq("template_id", templateId).order("sort_order"),
  ]);
  if (templateError) throw templateError;
  if (sectionsError) throw sectionsError;
  return { template: template as ReportTemplate, sections: (sections ?? []) as ReportTemplateSection[] };
}

export async function createTemplate(name: string) {
  const { data, error } = await db.from("report_templates").insert({ name }).select().single();
  if (error) throw error;
  return data as ReportTemplate;
}

export async function updateTemplate(id: string, payload: Partial<Pick<ReportTemplate, "name" | "description" | "sample_attachment_url" | "sample_attachment_name" | "cover_bg" | "cover_fg" | "logo_url">>) {
  const { error } = await db.from("report_templates").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(id: string) {
  const { error } = await db.from("report_templates").delete().eq("id", id);
  if (error) throw error;
}

/** Uploads the template's sample branding attachment (a past deck, logo, style reference)
 * to a public bucket -- it's a visual reference for the team, not confidential data. */
export async function uploadTemplateAttachment(templateId: string, file: File): Promise<{ url: string; name: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${templateId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("report-template-samples").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("report-template-samples").getPublicUrl(path);
  await updateTemplate(templateId, { sample_attachment_url: data.publicUrl, sample_attachment_name: file.name });
  return { url: data.publicUrl, name: file.name };
}

/** Uploads the template's cover-page logo (distinct from the general sample attachment) --
 * rendered directly on the assembled report's cover page. */
export async function uploadTemplateLogo(templateId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${templateId}/logo-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("report-template-samples").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("report-template-samples").getPublicUrl(path);
  await updateTemplate(templateId, { logo_url: data.publicUrl });
  return data.publicUrl;
}

/** Replaces every section on a template in one go -- used by the "regenerate from
 * attachment" wizard, which detects a whole new heading structure and swaps it in
 * wholesale rather than diffing against the old list. */
export async function replaceSections(templateId: string, sections: { title: string; level: 1 | 2 | 3 }[]) {
  const { error: deleteError } = await db.from("report_template_sections").delete().eq("template_id", templateId);
  if (deleteError) throw deleteError;
  if (!sections.length) return;
  const rows = sections.map((s, i) => ({ template_id: templateId, title: s.title, level: s.level, sort_order: i + 1 }));
  const { error: insertError } = await db.from("report_template_sections").insert(rows);
  if (insertError) throw insertError;
}

export async function createSection(templateId: string, sortOrder: number, title = "New Section", level: 1 | 2 | 3 = 1) {
  const { data, error } = await db.from("report_template_sections").insert({ template_id: templateId, title, sort_order: sortOrder, level }).select().single();
  if (error) throw error;
  return data as ReportTemplateSection;
}

export async function updateSection(id: string, payload: Partial<Pick<ReportTemplateSection, "title" | "sort_order" | "level">>) {
  const { error } = await db.from("report_template_sections").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteSection(id: string) {
  const { error } = await db.from("report_template_sections").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderSections(items: { id: string; sort_order: number }[]) {
  await Promise.all(items.map((it) => db.from("report_template_sections").update({ sort_order: it.sort_order }).eq("id", it.id)));
}
