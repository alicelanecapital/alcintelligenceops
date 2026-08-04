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
