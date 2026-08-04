import { SHARED_DRIVE_FOLDER_ID } from "@/lib/drive-folder";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const BUCKET = "dd-documents";

class DriveSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveSyncError";
  }
}

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
  const findParams = new URLSearchParams({
    q,
    fields: "files(id,name)",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });
  const findRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files?${findParams.toString()}`, { headers });
  if (findRes.ok) {
    const found = await findRes.json();
    if (found?.files?.[0]?.id) return found.files[0].id as string;
  } else {
    const body = (await findRes.text()).slice(0, 300);
    console.error(`Drive search failed [${findRes.status}]: ${body}`);
    throw new DriveSyncError(`Google Drive folder search failed (${findRes.status})`);
  }

  const createParams = new URLSearchParams({ fields: "id", supportsAllDrives: "true" });
  const createRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files?${createParams.toString()}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!createRes.ok) {
    const body = (await createRes.text()).slice(0, 300);
    console.error(`Drive folder create failed [${createRes.status}]: ${body}`);
    throw new DriveSyncError(`Google Drive rejected folder creation (${createRes.status})`);
  }
  return ((await createRes.json())?.id as string | null) ?? null;
}

async function assertRootFolderAccess(headers: Record<string, string>) {
  const params = new URLSearchParams({ fields: "id,name,mimeType", supportsAllDrives: "true" });
  const res = await fetch(`${DRIVE_GATEWAY}/drive/v3/files/${SHARED_DRIVE_FOLDER_ID}?${params.toString()}`, { headers });
  if (res.ok) return;

  const body = (await res.text()).slice(0, 300);
  console.error(`Drive root folder access failed [${res.status}]: ${body}`);
  if (res.status === 404 || res.status === 403) {
    throw new DriveSyncError(
      "The connected Google account cannot access the existing Alice Lane shared folder. Share that folder with georgia@alicelanecapital.com as Editor, then select Sync Drive again.",
    );
  }
  throw new DriveSyncError(`Google Drive could not validate the shared folder (${res.status})`);
}

/** Returns the company's own Drive subfolder id, nested under its sector folder,
 * creating both on the first upload: Shared folder / <Sector> / <Company>. */
export async function ensureCompanyFolder(companyName: string, sector: string | null, cachedId: string | null) {
  const headers = driveHeaders();
  if (!headers) return null;
  await assertRootFolderAccess(headers);

  if (cachedId) {
    const params = new URLSearchParams({ fields: "id", supportsAllDrives: "true" });
    const cachedRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files/${cachedId}?${params.toString()}`, { headers });
    if (cachedRes.ok) return cachedId;
    console.warn(`Cached company Drive folder is no longer reachable [${cachedRes.status}]; resolving it again`);
  }

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

  const uploadParams = new URLSearchParams({ uploadType: "multipart", fields: "id,webViewLink", supportsAllDrives: "true" });
  const res = await fetch(`${DRIVE_GATEWAY}/upload/drive/v3/files?${uploadParams.toString()}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const responseBody = (await res.text()).slice(0, 300);
    console.error(`Drive upload failed [${res.status}]: ${responseBody}`);
    throw new DriveSyncError(`Google Drive rejected the document upload (${res.status})`);
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
  let driveError: string | null = null;

  if (!driveHeaders()) {
    driveError = "Google Drive is not connected";
  } else {
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
      if (!folderId) {
        driveError = "Google Drive did not return a company folder";
      } else {
        if (data.companyId && folderId !== cached) {
          await supabaseAdmin.from("companies").update({ drive_folder_id: folderId } as any).eq("id", data.companyId);
        }
        const dl = await supabaseAdmin.storage.from(BUCKET).download(data.storagePath);
        if (!dl.data) {
          driveError = "stored file could not be read back for upload";
        } else {
          const uploaded = await uploadToDrive(folderId, data.fileName, data.mimeType, await dl.data.arrayBuffer());
          driveFileId = uploaded?.id ?? null;
          driveWebLink = uploaded?.webViewLink ?? (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null);
          if (!driveFileId) driveError = "Google Drive did not return an uploaded file";
        }
      }
    } catch (e: any) {
      console.error("Drive sync failed", e?.message);
      driveError = e?.message ?? "Drive sync failed";
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

  return { document: row, driveSynced: !!driveFileId, driveError };
}

/** Re-attempts the Drive upload for stored documents that have no drive_file_id yet. */
export async function syncPendingDocuments(input: { interviewId: string; companyId?: string | null; companyName?: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!driveHeaders()) return { synced: 0, failed: 0, error: "Google Drive is not connected" };

  let query = (supabaseAdmin.from("workspace_documents" as any) as any).select("*").is("drive_file_id", null);
  query = input.companyId ? query.eq("company_id", input.companyId) : query.eq("interview_id", input.interviewId);
  const { data: pending, error } = await query;
  if (error) throw error;

  const rows = (pending ?? []) as any[];
  if (!rows.length) return { synced: 0, failed: 0, error: null as string | null };

  const companyId = input.companyId ?? rows[0]?.company_id ?? null;
  let cached: string | null = null;
  let sector: string | null = null;
  let companyName = input.companyName ?? "Unfiled";
  if (companyId) {
    const { data: co } = await supabaseAdmin.from("companies").select("name, drive_folder_id, industry").eq("id", companyId).maybeSingle();
    cached = (co as any)?.drive_folder_id ?? null;
    sector = (co as any)?.industry ?? null;
    companyName = (co as any)?.name ?? companyName;
    if (!sector) {
      const { data: c } = await supabaseAdmin
        .from("contacts").select("sector").eq("company_id", companyId).not("sector", "is", null).limit(1).maybeSingle();
      sector = (c as any)?.sector ?? null;
    }
  }

  let folderId: string | null = null;
  try {
    folderId = await ensureCompanyFolder(companyName, sector, cached);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach the shared Drive folder";
    return { synced: 0, failed: rows.length, error: message };
  }
  if (!folderId) return { synced: 0, failed: rows.length, error: "Could not reach the shared Drive folder" };
  if (companyId && folderId !== cached) {
    await supabaseAdmin.from("companies").update({ drive_folder_id: folderId } as any).eq("id", companyId);
  }

  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    if (!row.storage_path) { failed++; continue; }
    const dl = await supabaseAdmin.storage.from(BUCKET).download(row.storage_path);
    if (!dl.data) { failed++; continue; }
    let uploaded: Awaited<ReturnType<typeof uploadToDrive>> = null;
    try {
      uploaded = await uploadToDrive(folderId, row.file_name, row.mime_type ?? "application/octet-stream", await dl.data.arrayBuffer());
    } catch (error) {
      console.error("Pending Drive upload failed", error instanceof Error ? error.message : error);
      failed++;
      continue;
    }
    if (!uploaded?.id) { failed++; continue; }
    await (supabaseAdmin.from("workspace_documents" as any) as any)
      .update({
        drive_file_id: uploaded.id,
        drive_web_link: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`,
      })
      .eq("id", row.id);
    synced++;
  }
  return { synced, failed, error: null as string | null };
}
