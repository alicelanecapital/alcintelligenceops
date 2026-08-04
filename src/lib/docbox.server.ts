import { SHARED_DRIVE_FOLDER_ID } from "@/lib/drive-folder";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const BUCKET = "dd-documents";

export type DocBoxStep = { key: number; title: string };

export function driveHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) return null;
  return { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey };
}

export async function classifyStep(fileName: string, snippet: string, steps: DocBoxStep[]) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || !steps.length) return { step_key: steps[0]?.key ?? 1, confidence: 0, reason: "No classifier available" };

  const system = `You file due-diligence documents against the correct stage of an investment playbook.
Return STRICT JSON: {"step_key": number, "confidence": number (0-1), "reason": string (one short sentence)}.
Pick the step_key from the provided list that this document most belongs to, even if it is not the stage currently open.`;
  const user = `Playbook steps:
${steps.map((s) => `${s.key}: ${s.title}`).join("\n")}

File name: ${fileName}
Content extract (may be empty):
${(snippet ?? "").slice(0, 4000)}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { step_key: steps[0].key, confidence: 0, reason: "Classification unavailable" };
    }
    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
    const stepKey = steps.some((s) => s.key === Number(parsed.step_key)) ? Number(parsed.step_key) : steps[0].key;
    return { step_key: stepKey, confidence: Number(parsed.confidence) || 0, reason: String(parsed.reason ?? "") };
  } catch (e: any) {
    console.error("classifyStep failed", e?.message);
    return { step_key: steps[0].key, confidence: 0, reason: "Classification failed" };
  }
}

async function findOrCreateFolder(name: string, parentId: string, headers: Record<string, string>) {
  const safeName = name.replace(/'/g, "\\'");
  const q = `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const findRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, { headers });
  if (findRes.ok) {
    const found = await findRes.json();
    if (found?.files?.[0]?.id) return found.files[0].id as string;
  } else {
    console.error(`Drive search failed [${findRes.status}]: ${(await findRes.text()).slice(0, 300)}`);
  }

  const createRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!createRes.ok) {
    console.error(`Drive folder create failed [${createRes.status}]: ${(await createRes.text()).slice(0, 300)}`);
    return null;
  }
  return ((await createRes.json())?.id as string | null) ?? null;
}

/** Returns the company's own Drive subfolder id, nested under its sector folder,
 * creating both on the first upload: Shared folder / <Sector> / <Company>. */
export async function ensureCompanyFolder(companyName: string, sector: string | null, cachedId: string | null) {
  const headers = driveHeaders();
  if (!headers) return null;
  if (cachedId) return cachedId;

  const sectorFolderId = await findOrCreateFolder((sector ?? "").trim() || "Unclassified", SHARED_DRIVE_FOLDER_ID, headers);
  if (!sectorFolderId) return null;
  return await findOrCreateFolder(companyName, sectorFolderId, headers);
}


export async function uploadToDrive(folderId: string, fileName: string, mimeType: string, bytes: ArrayBuffer) {
  const headers = driveHeaders();
  if (!headers) return null;
  const boundary = `albdry${Date.now()}`;
  const meta = JSON.stringify({ name: fileName, parents: [folderId] });
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = new Blob([head, bytes, tail]);

  const res = await fetch(`${DRIVE_GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    console.error(`Drive upload failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  return (await res.json()) as { id: string; webViewLink?: string };
}

export type FileDocInput = {
  interviewId: string;
  playbookId: string | null;
  companyId: string | null;
  companyName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  textSnippet: string;
  steps: DocBoxStep[];
};

/** Classifies an uploaded DocBox file, syncs it to the company's Drive folder, and records it. */
export async function fileDocument(data: FileDocInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const classification = await classifyStep(data.fileName, data.textSnippet, data.steps);
  const step = data.steps.find((s) => s.key === classification.step_key) ?? data.steps[0];

  let driveFileId: string | null = null;
  let driveWebLink: string | null = null;

  if (driveHeaders()) {
    try {
      let cached: string | null = null;
      let sector: string | null = null;
      if (data.companyId) {
        const { data: co } = await supabaseAdmin.from("companies").select("drive_folder_id, industry").eq("id", data.companyId).maybeSingle();
        cached = (co as any)?.drive_folder_id ?? null;
        sector = (co as any)?.industry ?? null;
      }
      if (!sector) {
        // Fall back to the sector recorded on the meeting's contact.
        const { data: c } = await supabaseAdmin
          .from("contacts")
          .select("sector")
          .eq("company_id", data.companyId ?? "00000000-0000-0000-0000-000000000000")
          .not("sector", "is", null)
          .limit(1)
          .maybeSingle();
        sector = (c as any)?.sector ?? null;
      }
      const folderId = await ensureCompanyFolder(data.companyName || "Unfiled", sector, cached);
      if (folderId) {
        if (data.companyId && folderId !== cached) {
          await supabaseAdmin.from("companies").update({ drive_folder_id: folderId } as any).eq("id", data.companyId);
        }
        const dl = await supabaseAdmin.storage.from(BUCKET).download(data.storagePath);
        if (dl.data) {
          const uploaded = await uploadToDrive(folderId, data.fileName, data.mimeType, await dl.data.arrayBuffer());
          driveFileId = uploaded?.id ?? null;
          driveWebLink = uploaded?.webViewLink ?? (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null);
        }
      }
    } catch (e: any) {
      console.error("Drive sync failed", e?.message);
    }
  }

  const { data: row, error } = await supabaseAdmin
    .from("workspace_documents" as any)
    .insert({
      interview_id: data.interviewId,
      playbook_id: data.playbookId,
      company_id: data.companyId,
      step_key: step?.key ?? null,
      step_title: step?.title ?? null,
      classification_confidence: classification.confidence,
      classification_reason: classification.reason,
      file_name: data.fileName,
      file_size_bytes: data.sizeBytes,
      mime_type: data.mimeType,
      storage_path: data.storagePath,
      extracted_text: data.textSnippet ? data.textSnippet.slice(0, 20000) : null,
      drive_file_id: driveFileId,
      drive_web_link: driveWebLink,
    } as any)
    .select()
    .single();
  if (error) throw error;

  return { document: row, driveSynced: !!driveFileId };
}
