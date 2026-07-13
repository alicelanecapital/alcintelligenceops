import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const BRIEF_SYSTEM = `You are an Alice Lane Capital investment analyst preparing an interviewer for a due diligence meeting.
Given the founder, company, and known external contacts (people outside Alice Lane who may attend), produce a short
stakeholder brief for the Alice Lane interviewer covering who from the OUTSIDE (external, non-Alice-Lane) side is
likely to attend and what to know about each of them.
Return STRICT JSON with keys:
{
  "attendees": [{ "name": string, "role": string, "org": string, "notes": string }],
  "talking_points": string[],
  "relationship_history": string
}
Only include people from the external contacts list provided plus the founder. Never invent people who weren't given to you.
Keep notes to one sentence each, specific and actionable for an interviewer walking in cold.`;

export const generateStakeholderBrief = createServerFn({ method: "POST" })
  .inputValidator((d: { opportunityId: string; interviewId: string; round: number }) => d)
  .handler(async ({ data }) => {
    // Admin client: this reads across opportunities/contacts regardless of who's asking, and
    // both tables' RLS ("to authenticated") would otherwise hide rows from a plain anon-key
    // client with no user session -- the contacts query would silently return zero rows.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: opp, error: oppError } = await supabaseAdmin
      .from("opportunities")
      .select("*, founder:founders(name, startup_name, sector, email, phone), company:companies(name, industry, summary)")
      .eq("id", data.opportunityId)
      .maybeSingle();
    if (oppError) throw oppError;
    if (!opp) throw new Error(`Opportunity ${data.opportunityId} not found`);

    const companyName = (opp as any).company?.name ?? (opp as any).founder?.startup_name ?? (opp as any).name;

    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("name, category, position, email, phone, notes")
      .ilike("company", `%${companyName}%`);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Company: ${companyName}
Industry: ${(opp as any).company?.industry ?? (opp as any).industry ?? "unknown"}
Founder: ${(opp as any).founder?.name ?? "unknown"}
Round: ${data.round} of 5

Known external contacts (from the CRM, associated with this company):
${JSON.stringify(contacts ?? [])}
`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: BRIEF_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let brief: any;
    try { brief = JSON.parse(content); } catch { brief = { attendees: [], talking_points: [], relationship_history: content }; }
    brief.generated_at = new Date().toISOString();

    await supabaseAdmin.from("dd_interviews").update({ stakeholder_brief: brief }).eq("id", data.interviewId);

    return brief;
  });
