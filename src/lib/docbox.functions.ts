import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FileDocInput } from "@/lib/docbox.server";

export const fileWorkspaceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FileDocInput) => d)
  .handler(async ({ data }) => {
    const { fileDocument } = await import("@/lib/docbox.server");
    return await fileDocument(data);
  });

/** Pushes DocBox documents that never reached Google Drive (e.g. uploaded while the Drive
 * connection lacked permission) into the company's Drive folder. */
export const syncPendingDocBoxDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { interviewId: string; companyId?: string | null; companyName?: string }) => d)
  .handler(async ({ data }) => {
    const { syncPendingDocuments } = await import("@/lib/docbox.server");
    return await syncPendingDocuments(data);
  });
