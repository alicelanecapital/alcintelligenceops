import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Start a meeting for a contact: creates an interview row linked back to the contact + event.
export const startMeetingForContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string; meetingType?: string; interviewer?: string }) => d)
  .handler(async ({ data, context }) => {
    const s = context.supabase;

    const { data: contact, error } = await s
      .from("contacts")
      .select("*, source_event:events(id, name)")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw error;
    if (!contact) throw new Error("Contact not found");

    const c: any = contact;
    const founderName = c.name;
    const businessName = c.company ?? c.name;

    const { data: row, error: insErr } = await s
      .from("interviews")
      .insert({
        contact_id: c.id,
        event_id: c.source_event_id,
        founder_id: c.legacy_founder_id ?? null,
        organisation_id: c.organisation_id ?? null,
        title: `${founderName} · ${businessName}`,
        founder_name: founderName,
        business_name: businessName,
        industry: null,
        interviewer_name: data.interviewer ?? null,
        status: "draft",
        meeting_type: data.meetingType ?? "intro",
      } as any)
      .select("*")
      .single();
    if (insErr) throw insErr;

    // Bump last_interaction_at on the contact
    await s.from("contacts").update({ last_interaction_at: new Date().toISOString() } as any).eq("id", c.id);

    return row;
  });

// Create an opportunity from a contact, pulling in the latest meeting context.
export const createOpportunityFromContact = createServerFn({ method: "POST" })
  .inputValidator((d: { contactId: string }) => d)
  .handler(async ({ data }) => {
    const s = sb();
    const { data: contact, error } = await s
      .from("contacts")
      .select("*, source_event:events(id, name)")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw error;
    if (!contact) throw new Error("Contact not found");
    const c: any = contact;

    // Latest meeting + report
    const { data: meetings } = await s
      .from("interviews")
      .select("*")
      .eq("contact_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = meetings?.[0];

    let summary = c.ai_summary ?? "";
    if (latest) {
      const { data: report } = await s
        .from("interview_reports")
        .select("body")
        .eq("interview_id", (latest as any).id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (report && (report as any).body?.executive_summary) {
        summary = (report as any).body.executive_summary;
      }
    }

    const { data: opp, error: oppErr } = await s
      .from("opportunities")
      .insert({
        name: c.company ?? c.name,
        contact_id: c.id,
        event_id: c.source_event_id,
        meeting_id: (latest as any)?.id ?? null,
        founder_id: c.legacy_founder_id ?? null,
        company_id: null,
        current_stage: "Screening",
        priority: "Medium",
        source: (c.source_event as any)?.name ?? "Contact",
        summary,
        description: summary,
      } as any)
      .select("*")
      .single();
    if (oppErr) throw oppErr;

    return opp;
  });
