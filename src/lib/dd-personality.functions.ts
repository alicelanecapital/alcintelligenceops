import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const DISC_SYSTEM = `You are an organisational psychologist assessing a founder's DISC personality profile
(Dominance, Influence, Steadiness, Conscientiousness) purely from the language and thought structure
in their own words across one or more due diligence interview transcripts. This is a founder-assessment
tool for an investor, not a clinical diagnosis -- ground every claim in specific phrasing or reasoning
patterns you can point to in the transcript text provided.

Return STRICT JSON with keys:
{
  "dominance": { "score": number, "label": "Low"|"Moderate"|"High", "evidence": string },
  "influence": { "score": number, "label": "Low"|"Moderate"|"High", "evidence": string },
  "steadiness": { "score": number, "label": "Low"|"Moderate"|"High", "evidence": string },
  "conscientiousness": { "score": number, "label": "Low"|"Moderate"|"High", "evidence": string },
  "primary_style": string,
  "secondary_style": string,
  "summary": string,
  "investor_considerations": string[]
}
Scores are 0-100. "evidence" must quote or closely paraphrase specific lines from the transcripts.
"investor_considerations" are practical notes for how this profile affects working with this founder
(e.g. communication style, what motivates them, likely blind spots) -- not personality-test filler.`;

/** Aggregates every dd_interviews.transcript recorded so far for this opportunity and infers a DISC profile. */
export const generateDiscProfile = createServerFn({ method: "POST" })
  .inputValidator((d: { opportunityId: string }) => d)
  .handler(async ({ data }) => {
    // Every exit from this handler must throw a plain Error -- some thrown values (e.g. PostgrestError
    // instances, raw fetch failures) don't survive the client/server RPC serialization boundary cleanly
    // and surface as an opaque "Seroval Error" instead of the real message.
    try {
      // Admin client: this aggregates across every round for the opportunity regardless of who's
      // asking, and dd_interviews' RLS ("to authenticated") would otherwise hide rows from a plain
      // anon-key client with no user session.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: interviews, error } = await supabaseAdmin
        .from("dd_interviews")
        .select("round, transcript")
        .eq("opportunity_id", data.opportunityId)
        .not("transcript", "is", null)
        .order("round");
      if (error) throw new Error(error.message);

      const withTranscript = (interviews ?? []).filter((i) => (i.transcript ?? "").trim().length > 0);
      if (!withTranscript.length) {
        // Return null instead of throwing -- callers auto-invoke this on every round load,
        // and a thrown error surfaces as an unhandled RUNTIME_ERROR / blank screen even when
        // the caller .catch()es it (error reporter hooks in before the promise settles).
        return null;
      }


      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("LOVABLE_API_KEY not configured");

      const userPrompt = withTranscript
        .map((i) => `--- Round ${i.round} transcript ---\n${(i.transcript ?? "").slice(0, 6000)}`)
        .join("\n\n");

      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: DISC_SYSTEM },
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
      let profile: any;
      try { profile = JSON.parse(content); } catch { profile = { summary: content }; }

      profile.generated_at = new Date().toISOString();
      profile.rounds_analyzed = withTranscript.map((i) => i.round);

      const { error: updateError } = await supabaseAdmin.from("opportunities").update({ disc_profile: profile } as any).eq("id", data.opportunityId);
      if (updateError) throw new Error(updateError.message);

      return profile;
    } catch (e: any) {
      throw new Error(e?.message ?? "Failed to generate DISC profile");
    }
  });
