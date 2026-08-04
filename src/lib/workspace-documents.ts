import { supabase } from "@/integrations/supabase/client";

export type WorkspaceDocument = {
  id: string;
  interview_id: string;
  company_id: string | null;
  step_key: number | null;
  step_title: string | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  storage_path: string | null;
  drive_file_id: string | null;
  drive_web_link: string | null;
  uploaded_at: string;
};

export const DOCBOX_BUCKET = "dd-documents";

export async function listWorkspaceDocuments(interviewId: string): Promise<WorkspaceDocument[]> {
  const { data, error } = await (supabase.from("workspace_documents" as any) as any)
    .select("*")
    .eq("interview_id", interviewId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkspaceDocument[];
}

export async function listCompanyWorkspaceDocuments(companyId: string): Promise<WorkspaceDocument[]> {
  const { data, error } = await (supabase.from("workspace_documents" as any) as any)
    .select("*")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkspaceDocument[];
}

export async function deleteWorkspaceDocument(id: string) {
  const { error } = await (supabase.from("workspace_documents" as any) as any).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDocBoxFile(interviewId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `docbox/${interviewId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(DOCBOX_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getDocBoxSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from(DOCBOX_BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

/** Text-ish files get a content extract so the classifier has more than a file name to go on.
 * Binary formats (PDF/DOCX/images) are classified on file name alone. */
export async function readTextSnippet(file: File): Promise<string> {
  const textish = /^text\//.test(file.type) || /\.(txt|md|csv|json|vtt|srt)$/i.test(file.name);
  if (!textish || file.size > 2_000_000) return "";
  try {
    return (await file.text()).slice(0, 8000);
  } catch {
    return "";
  }
}
