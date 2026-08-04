import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** A deal opens the same Live Workspace a meeting does: one `interviews` row per deal,
 * driven by the DD Intelligence Engine playbook so its rounds become the workspace steps. */
export const resolveDealWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dealId: string }) => d)
  .handler(async ({ data, context }) => {
    const s = context.supabase;

    const { data: existingRows, error: exErr } = await s
      .from("interviews")
      .select("*")
      .eq("deal_id", data.dealId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (exErr) throw exErr;

    const { data: ddToolkit } = await s
      .from("toolkits")
      .select("id")
      .eq("kind", "due_diligence")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const playbookId = (ddToolkit as any)?.id ?? null;

    const existing: any = existingRows?.[0];
    if (existing) {
      if (playbookId && !existing.playbook_id) {
        const { data: updated } = await s
          .from("interviews")
          .update({ playbook_id: playbookId } as any)
          .eq("id", existing.id)
          .select("*")
          .single();
        return updated ?? existing;
      }
      return existing;
    }

    const { data: deal, error: dealErr } = await s
      .from("opportunities")
      .select("*, company:companies(id, name, industry), founder:founders(name, startup_name, sector)")
      .eq("id", data.dealId)
      .maybeSingle();
    if (dealErr) throw dealErr;
    if (!deal) throw new Error("Deal not found");
    const d: any = deal;

    const businessName = d.company?.name ?? d.founder?.startup_name ?? d.name;
    const founderName = d.founder?.name ?? d.name;
    const industry = d.company?.industry ?? d.founder?.sector ?? d.industry ?? null;

    const { data: row, error: insErr } = await s
      .from("interviews")
      .insert({
        deal_id: d.id,
        contact_id: d.contact_id ?? null,
        founder_id: d.founder_id ?? null,
        title: `${businessName} · Due Diligence`,
        founder_name: founderName,
        business_name: businessName,
        industry,
        status: "draft",
        meeting_type: "due_diligence",
        playbook_id: playbookId,
      } as any)
      .select("*")
      .single();
    if (insErr) throw insErr;
    return row;
  });
