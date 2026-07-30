// Parses an uploaded questionnaire/playbook document into a structured round/question
// shape the designer can write straight into dd_framework_rounds/questions.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string): Promise<any> {
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
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch { return {}; }
}

const SYSTEM = `You convert an uploaded due-diligence questionnaire or interview playbook document into a
structured template for Alice Lane Capital's playbook designer. Read the document and group its
questions into logical rounds (sections/stages) exactly as the document already organizes them --
do not invent structure the document doesn't have. If the document has no clear grouping, put every
question into a single round.

Return STRICT JSON:
{
  "playbook_name": string,       // short name for this playbook, inferred from the document title/purpose
  "playbook_description": string, // one sentence
  "rounds": [
    {
      "title": string,           // e.g. "Round 1: Sense Check" -- reuse the document's own section title if present
      "subtitle": string,
      "purpose": string,
      "duration": string,        // best guess, e.g. "30 minutes", empty string if not inferable
      "questions": [
        {
          "question_text": string,
          "rephrased_question": string,  // an alternate, more conversational phrasing; empty string if none needed
          "why_text": string,            // why this question matters, empty string if not stated in the document
          "internal_guideline": string,  // any internal-only guidance the document gives for assessing the answer; empty string if none
          "grading": [ { "text": string, "severity": "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR" } ]  // only include if the document itself defines answer-grading criteria; otherwise empty array
        }
      ]
    }
  ]
}
Never invent questions that aren't in the document. Preserve the document's own wording for question_text.`;

export const parsePlaybookDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => d)
  .handler(async ({ data }) => {
    if (!data.text?.trim()) throw new Error("Document appears to be empty");
    const truncated = data.text.slice(0, 60000);
    const result = await callAI(SYSTEM, `Document contents:\n\n${truncated}`);
    if (!Array.isArray(result?.rounds) || !result.rounds.length) {
      throw new Error("Couldn't find any questions in this document -- check it uploaded correctly.");
    }
    return result as {
      playbook_name: string;
      playbook_description: string;
      rounds: {
        title: string; subtitle: string; purpose: string; duration: string;
        questions: {
          question_text: string; rephrased_question: string; why_text: string;
          internal_guideline: string; grading: { text: string; severity: "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR" }[];
        }[];
      }[];
    };
  });
