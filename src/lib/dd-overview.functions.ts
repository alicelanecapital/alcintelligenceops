import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const OVERVIEW_SYSTEM = `You are an Alice Lane Capital investment analyst maintaining a running AI overview of a due
diligence process, updated as each round completes. Synthesise everything provided (company/founder details, DISC
personality profile if present, and every round's transcript and AI analysis so far) into a concise executive overview
for a partner who wants the current state in under 30 seconds of reading.

Return STRICT JSON with keys:
{
  "headline": string,
  "summary": string,
  "key_risks": string[],
  "key_strengths": string[],
  "recommendation": string,
  "rounds_covered": number[]
}
"headline" is one short sentence (investment-committee style, e.g. "Strong operator, clean financials, minor lease risk").
"summary" is 2-4 sentences grounded in the actual evidence provided -- never invent facts not present in the input.
Keep "key_risks" and "key_strengths" to short phrases, 3 max each.`;

/** Aggregates company/founder details, the DISC profile, and every round recorded so far into a running AI overview. */
export const generateOpportunityOverview = createServerFn({ method: "POST" })
  .inputValidator((d: { opportunityId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: opp, error: oppError } = await supabaseAdmin
      .from("opportunities")
      .select("*, founder:founders(name, startup_name, sector), company:companies(name, industry, summary)")
      .eq("id", data.opportunityId)
      .maybeSingle();
    if (oppError) throw new Error(oppError.message);
    if (!opp) throw new Error("Opportunity not found");

    const { data: interviews, error: intError } = await supabaseAdmin
      .from("dd_interviews")
      .select("round, status, transcript, ai_analysis, detected_sector, sector_confidence")
      .eq("opportunity_id", data.opportunityId)
      .order("round");
    if (intError) throw new Error(intError.message);

    const rounds = (interviews ?? []).filter((i) => (i.transcript ?? "").trim().length > 0 || i.ai_analysis);
    if (!rounds.length) {
      // Return null instead of throwing -- this runs automatically on every round load and a
      // thrown error surfaces as an unhandled RUNTIME_ERROR / blank screen even when caught.
      return null;
    }


    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const companyName = (opp as any).company?.name ?? (opp as any).founder?.startup_name ?? (opp as any).name;
    const discProfile = (opp as any).disc_profile;

    const userPrompt = `Company: ${companyName}
Industry: ${(opp as any).company?.industry ?? (opp as any).industry ?? "unknown"}
Founder: ${(opp as any).founder?.name ?? "unknown"}

DISC profile (if generated): ${discProfile ? JSON.stringify(discProfile) : "not yet generated"}

Rounds so far:
${rounds.map((r) => `--- Round ${r.round} (${r.status}) ---\nTranscript excerpt: ${(r.transcript ?? "").slice(0, 3000)}\nAI analysis: ${JSON.stringify(r.ai_analysis ?? {})}`).join("\n\n")}
`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: OVERVIEW_SYSTEM },
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
    let overview: any;
    try { overview = JSON.parse(content); } catch { overview = { summary: content }; }
    overview.generated_at = new Date().toISOString();
    overview.rounds_covered = rounds.map((r) => r.round);

    // ai_overview is new (20260720000000_opportunity_ai_overview.sql) and not yet in the
    // generated Supabase types -- cast until types.ts is regenerated post-migration.
    const { error: updateError } = await (supabaseAdmin.from("opportunities") as any).update({ ai_overview: overview }).eq("id", data.opportunityId);
    if (updateError) throw new Error(updateError.message);

    return overview;
  });
