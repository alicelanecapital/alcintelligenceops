import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side signature save. Client-side upserts were silently no-op'ing
 * for some sessions (RLS returning 0 affected rows without an error), so we
 * write via `context.supabase` (RLS-scoped to the caller) and read the row
 * back to verify the persisted length matches.
 */
export const updateMyEmailSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emailSignature: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("profiles")
      .upsert({ id: context.userId, email_signature: data.emailSignature });
    if (error) throw new Error(error.message);
    const { data: row, error: readErr } = await (context.supabase as any)
      .from("profiles")
      .select("email_signature")
      .eq("id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    const persisted = (row?.email_signature ?? "") as string;
    if (persisted.length !== data.emailSignature.length) {
      throw new Error(
        `Signature failed to persist (wrote ${data.emailSignature.length} chars, DB has ${persisted.length}). Check RLS on public.profiles.`,
      );
    }
    return { ok: true, length: persisted.length };
  });
