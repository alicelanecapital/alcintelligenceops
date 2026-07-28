import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

/**
 * Generates (and caches) a short AI stakeholder brief for a single contact.
 * Shown on the contact detail page under the Source event card.
 */
export const generateContactStakeholderBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string; force?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { data: contact, error } = await s
      .from("contacts")
      .select("*, source_event:events(name, city, country, start_date)")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw error;
    if (!contact) throw new Error("Contact not found");
    const c: any = contact;
    if (!data.force && c.stakeholder_brief) return c.stakeholder_brief;

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const user = `Contact: ${c.name}
Company: ${c.company ?? "unknown"}
Role: ${c.position ?? "unknown"}
Category: ${c.category ?? "unknown"}
Source event: ${c.source_event?.name ?? "n/a"}${c.source_event?.city ? ` (${c.source_event.city})` : ""}
Notes: ${c.notes ?? "n/a"}
Company description: ${c.company_description ?? "n/a"}

Write a concise background-intelligence brief on this person for an Alice Lane Capital partner. This is BACKGROUND ONLY — who they are, their career trajectory, reputation, network, communication style. Do NOT include anything about the upcoming meeting, deal, talking points, watch-outs, or engagement strategy.
Return STRICT JSON:
{
  "summary": "2-3 sentences on their background: career arc, expertise, reputation.",
  "background_points": ["3-5 short factual background points: prior roles, notable achievements, network, communication style"]
}`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You return strict JSON only. No prose, no markdown." },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let brief: any = {};
    try { brief = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) brief = JSON.parse(m[0]);
    }
    brief = {
      summary: String(brief.summary ?? ""),
      background_points: Array.isArray(brief.background_points) ? brief.background_points.map(String) : [],
      generated_at: new Date().toISOString(),
    };
    await s.from("contacts").update({ stakeholder_brief: brief } as any).eq("id", data.contactId);
    return brief;
  });
