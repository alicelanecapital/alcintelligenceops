import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const ANOMALY_SYSTEM = `You are an Alice Lane Capital due diligence analyst preparing for an upcoming interview round.
Before the meeting, review which documents were expected versus what has actually been received, and anything
notable about the documents themselves (missing items, unusually small/large files, names that don't match what
was requested, or contradictions with what was discussed in earlier rounds). From that, produce a short list of
targeted follow-up questions the interviewer should raise in this round to resolve those anomalies.

Return STRICT JSON with key "questions": an array of objects, each { "question": string, "rationale": string }.
"question" is a single, direct question to ask the founder in the meeting.
"rationale" is one short sentence explaining the anomaly or gap that prompted it.
Only include questions genuinely grounded in the information provided -- if nothing is missing or unusual, return
an empty array rather than inventing generic questions.
Return at most 6 questions.`;

/**
 * Generates follow-up questions from document-level anomalies (missing expected documents,
 * odd file names/sizes, gaps vs. what earlier rounds discussed) ahead of a round's meeting.
 * This is metadata-level analysis (file names, categories, sizes, any extracted_text we could
 * read) rather than deep parsing of every document's content -- the app can't reliably parse
 * arbitrary PDFs/Word docs on the server, so this grounds the AI in what's actually knowable.
 */
export const generateAnomalyQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: { opportunityId: string; interviewId: string; round: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: interview, error: interviewError } = await supabaseAdmin
      .from("dd_interviews")
      .select("round, transcript, ai_analysis")
      .eq("id", data.interviewId)
      .maybeSingle();
    if (interviewError) throw new Error(interviewError.message);
    if (!interview) throw new Error("Interview round not found");

    // Documents expected for this round are this round's own dd_framework_documents entries.
    // Round 1 also pulls in round 2's, matching the "Documents Required" step's merge (round 1
    // has no earlier round to have already requested documents ahead of time).
    const roundsToFetch = data.round === 1 ? [1, 2] : [data.round];
    const { data: expected, error: expectedError } = await (supabaseAdmin.from("dd_framework_documents" as any) as any)
      .select("name, purpose")
      .in("round", roundsToFetch)
      .order("sort_order");
    if (expectedError) throw new Error(expectedError.message);
    const expectedDocs: { name: string; purpose: string | null }[] = expected ?? [];

    const { data: received, error: receivedError } = await (supabaseAdmin.from("dd_interview_documents" as any) as any)
      .select("file_name, file_size_bytes, document_category, extracted_text, uploaded_at")
      .eq("interview_id", data.interviewId)
      .order("uploaded_at");
    if (receivedError) throw new Error(receivedError.message);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Round: ${data.round}

Documents expected before this round:
${expectedDocs.length ? expectedDocs.map((d) => `- ${d.name}${d.purpose ? ` (${d.purpose})` : ""}`).join("\n") : "(none specified)"}

Documents actually received so far:
${
  received?.length
    ? received
        .map((d: any) => `- ${d.file_name} (${d.document_category ?? "unspecified"}, ${d.file_size_bytes ?? "unknown"} bytes)${d.extracted_text ? `\n  Excerpt: ${d.extracted_text.slice(0, 1500)}` : ""}`)
        .join("\n")
    : "(none received yet)"
}

Prior transcript excerpt for this round (if recorded already): ${(interview.transcript ?? "").slice(0, 2000) || "(not recorded yet)"}
Prior AI analysis for this round (if any): ${interview.ai_analysis ? JSON.stringify(interview.ai_analysis).slice(0, 1500) : "(none yet)"}
`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: ANOMALY_SYSTEM },
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
    let parsed: { questions?: { question: string; rationale?: string }[] };
    try { parsed = JSON.parse(content); } catch { parsed = { questions: [] }; }
    const questions = (parsed.questions ?? []).filter((q) => q.question?.trim());
    if (!questions.length) return [];

    const { data: existing } = await (supabaseAdmin.from("dd_interview_extra_questions" as any) as any)
      .select("sort_order")
      .eq("interview_id", data.interviewId)
      .order("sort_order", { ascending: false })
      .limit(1);
    let nextSort = ((existing?.[0] as any)?.sort_order ?? -1) + 1;

    const rows = questions.map((q) => ({
      interview_id: data.interviewId,
      question_text: q.question.trim(),
      rationale: q.rationale ?? null,
      sort_order: nextSort++,
      source: "ai_document_review" as const,
    }));

    const { data: inserted, error: insertError } = await (supabaseAdmin.from("dd_interview_extra_questions" as any) as any)
      .insert(rows)
      .select("*");
    if (insertError) throw new Error(insertError.message);
    return inserted ?? [];
  });
