import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

// Generates a short "what does this company do" description for the Add Contact
// wizard. Used to populate contacts.company_description, which then flows into
// opportunities.description (via createOpportunityFromContact below) and is shown
// in the DD wizard's fixed company panel.
export const generateCompanyDescription = createServerFn({ method: "POST" })
  .inputValidator((d: { company: string; website?: string; position?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.company?.trim()) throw new Error("Company name is required");
    const user = `Company name: ${data.company}
${data.website ? `Website: ${data.website}` : ""}
${data.position ? `Contact's role there: ${data.position}` : ""}

Write a concise 1-2 sentence description of what this company does (its product/service and target market). If you don't have specific knowledge of this company, make a reasonable, clearly-general inference from its name and any context given rather than inventing false specifics.`;
    const description = await callAI(
      "You are a research analyst writing crisp one-line company descriptions for an investor's CRM. Return plain text only, no markdown, no preamble.",
      user,
    );
    return { description };
  });

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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string }) => d)
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

    // Latest meeting + report
    const { data: meetings } = await s
      .from("interviews")
      .select("*")
      .eq("contact_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = meetings?.[0];

    let summary = c.company_description || c.ai_summary || "";
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
        description: c.company_description || summary,
      } as any)
      .select("*")
      .single();
    if (oppErr) throw oppErr;

    return opp;
  });
