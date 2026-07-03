// Server-side helpers for the interview engine.
// Calls Lovable AI Gateway directly (OpenAI-compatible chat completions).

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

function server() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
}

async function callAI(system: string, user: string, json = true): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: any = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (json) body.response_format = { type: "json_object" };
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  if (!json) return content;
  try { return JSON.parse(content); }
  catch { return { raw: content }; }
}

const BRIEF_SYSTEM = `You are an experienced Alice Lane Capital investment committee analyst preparing an interviewer for a founder meeting.
Return STRICT JSON with keys:
{
  "known_risks": string[],
  "potential_opportunities": string[],
  "focus_areas": string[],
  "opening_questions": string[],
  "outstanding_documents": string[],
  "summary": string
}
Be concrete and specific to the founder/business context. Never invent numbers not provided.`;

const ANALYSIS_SYSTEM = `You are an Alice Lane Capital investment committee AI sitting beside an interviewer during a live founder meeting.
Analyse the transcript so far. Return STRICT JSON with these keys:
{
  "facts": [{ "subject": string, "predicate": string, "value": string, "evidence": string }],
  "risks": [{ "category": string, "rating": "Low"|"Medium"|"High"|"Critical", "reason": string, "evidence": string, "mitigation": string }],
  "contradictions": [{ "statement_a": string, "statement_b": string, "reason": string }],
  "missing_evidence": [{ "topic": string, "why": string }],
  "follow_up_questions": [{ "question": string, "reason": string, "alternative": string }],
  "document_requests": [{ "doc_type": string, "reason": string }],
  "scores": {
    "confidence": { "value": "Very Low"|"Low"|"Medium"|"High"|"Very High", "why": string },
    "consistency": { "value": "Very Low"|"Low"|"Medium"|"High"|"Very High", "why": string },
    "specificity": { "value": "Very Low"|"Low"|"Medium"|"High"|"Very High", "why": string },
    "commercial_understanding": { "value": "Very Low"|"Low"|"Medium"|"High"|"Very High", "why": string },
    "financial_understanding": { "value": "Very Low"|"Low"|"Medium"|"High"|"Very High", "why": string },
    "coachability": { "value": "Very Low"|"Low"|"Medium"|"High"|"Very High", "why": string }
  }
}
Risk categories must be one of: "Founder Risk","Cash Leakage Risk","Revenue Quality Risk","Debt Risk","Tax Risk","Expansion Risk","Minority Ownership Risk","Liquidity Risk","Exit Risk".
Ground every finding in explicit transcript evidence. Prefer fewer, higher-quality items over speculation.`;

const REPORT_SYSTEM = `You are the Alice Lane Capital investment committee lead writing the post-interview memo suite.
Return STRICT JSON with keys:
{
  "executive_summary": string,
  "founder_summary": string,
  "business_summary": string,
  "risk_assessment": [{ "category": string, "rating": string, "reason": string, "mitigation": string }],
  "mess_classification": { "level": "Green Mess"|"Amber Mess"|"Red Mess"|"Black Mess"|"Strategic Mess", "reason": string, "evidence": string, "next_step": string },
  "investment_readiness": {
    "overall_score": number,
    "confidence": { "score": number, "why": string },
    "evidence_completeness": { "score": number, "why": string },
    "founder_readiness": { "score": number, "why": string },
    "operational_maturity": { "score": number, "why": string },
    "financial_visibility": { "score": number, "why": string },
    "growth_readiness": { "score": number, "why": string }
  },
  "recommendation": {
    "verdict": "Proceed"|"Proceed with Conditions"|"Request More Evidence"|"Observe"|"Decline",
    "why": string,
    "conditions": string[]
  },
  "strengths": string[],
  "weaknesses": string[],
  "value_creation_opportunities": string[],
  "return_pathways": string[],
  "suggested_deal_structure": string,
  "equity_range": string,
  "priority_workstreams": string[],
  "outstanding_questions": string[],
  "evidence_required": string[],
  "recommended_next_steps": string[],
  "hundred_day_plan": [{ "day_range": string, "workstream": string, "outcome": string }],
  "suggested_specialists": string[]
}
Scores are 0-100. Ground everything in the transcript, facts and analyses provided.`;

// ---- Server functions ----

export const startInterview = createServerFn({ method: "POST" })
  .inputValidator((d: { founderId?: string; founderName?: string; businessName?: string; industry?: string; interviewer?: string }) => d)
  .handler(async ({ data }) => {
    const sb = server();
    let founder: any = null;
    let org: any = null;
    if (data.founderId) {
      const { data: f } = await sb.from("founders").select("*, organisation:organisations(*)").eq("id", data.founderId).maybeSingle();
      founder = f;
      org = (f as any)?.organisation;
    }

    const founderName = data.founderName ?? founder?.name ?? "Unknown founder";
    const businessName = data.businessName ?? founder?.startup_name ?? org?.name ?? "Unknown business";
    const industry = data.industry ?? founder?.sector ?? org?.industry ?? org?.category ?? null;

    const briefUser = `Founder: ${founderName}
Business: ${businessName}
Industry: ${industry ?? "unknown"}
Referral source: ${founder?.referral_source ?? "unknown"}
Prior stage: ${founder?.stage ?? "unknown"}
Prior AI score: ${founder?.ai_investment_score ?? "unknown"}
Organisation notes: ${org?.notes ?? "none"}
Organisation purpose: ${org?.purpose ?? "n/a"}
Who they serve: ${org?.who_they_serve ?? "n/a"}
Fit rating: ${org?.fit_rating ?? "n/a"}
`;
    let brief: any = null;
    try { brief = await callAI(BRIEF_SYSTEM, briefUser); } catch (e) { brief = { error: String(e) }; }

    const { data: row, error } = await sb.from("interviews").insert({
      founder_id: data.founderId ?? null,
      organisation_id: (org?.id as string) ?? null,
      title: `${founderName} · ${businessName}`,
      founder_name: founderName,
      business_name: businessName,
      industry,
      interviewer_name: data.interviewer ?? null,
      status: "draft",
      brief,
    }).select("*").single();
    if (error) throw error;
    return row;
  });

export const analyzeInterview = createServerFn({ method: "POST" })
  .inputValidator((d: { interviewId: string }) => d)
  .handler(async ({ data }) => {
    const sb = server();
    const [{ data: interview }, { data: utterances }, { data: prior }] = await Promise.all([
      sb.from("interviews").select("*").eq("id", data.interviewId).maybeSingle(),
      sb.from("interview_utterances").select("*").eq("interview_id", data.interviewId).order("ts_ms"),
      sb.from("interview_analyses").select("payload").eq("interview_id", data.interviewId).eq("kind", "fact"),
    ]);
    if (!interview) throw new Error("Interview not found");

    const transcript = (utterances ?? []).map((u: any) => `[${Math.floor(u.ts_ms/1000)}s ${u.speaker}] ${u.text}`).join("\n");
    const priorFacts = (prior ?? []).map((r: any) => r.payload).slice(0, 60);

    const userPrompt = `Founder: ${interview.founder_name}
Business: ${interview.business_name}
Industry: ${interview.industry ?? "unknown"}
Current interview stage: ${interview.current_stage ?? "Founder"}

Previously extracted facts (JSON):
${JSON.stringify(priorFacts).slice(0, 8000)}

Transcript so far:
${transcript.slice(-12000)}
`;
    const result = await callAI(ANALYSIS_SYSTEM, userPrompt);

    // Persist as analyses rows so the UI can subscribe / re-read.
    const rows: any[] = [];
    for (const f of result.facts ?? []) rows.push({ interview_id: data.interviewId, kind: "fact", payload: f });
    for (const r of result.risks ?? []) rows.push({ interview_id: data.interviewId, kind: "risk", payload: r });
    for (const c of result.contradictions ?? []) rows.push({ interview_id: data.interviewId, kind: "contradiction", payload: c });
    for (const m of result.missing_evidence ?? []) rows.push({ interview_id: data.interviewId, kind: "missing_evidence", payload: m });
    for (const q of result.follow_up_questions ?? []) rows.push({ interview_id: data.interviewId, kind: "follow_up", payload: q });
    if (result.scores) rows.push({ interview_id: data.interviewId, kind: "score", payload: result.scores });
    if (rows.length) await sb.from("interview_analyses").insert(rows);

    // Doc requests
    if (Array.isArray(result.document_requests) && result.document_requests.length) {
      await sb.from("document_requests").insert(
        result.document_requests.map((d: any) => ({ interview_id: data.interviewId, doc_type: d.doc_type, reason: d.reason })),
      );
    }
    // Question suggestions log
    if (Array.isArray(result.follow_up_questions) && result.follow_up_questions.length) {
      await sb.from("question_suggestions").insert(
        result.follow_up_questions.map((q: any) => ({ interview_id: data.interviewId, stage: interview.current_stage, question: q.question, reason: q.reason })),
      );
    }

    return result;
  });

export const finalizeInterview = createServerFn({ method: "POST" })
  .inputValidator((d: { interviewId: string }) => d)
  .handler(async ({ data }) => {
    const sb = server();
    const [{ data: interview }, { data: utterances }, { data: analyses }, { data: notes }] = await Promise.all([
      sb.from("interviews").select("*").eq("id", data.interviewId).maybeSingle(),
      sb.from("interview_utterances").select("*").eq("interview_id", data.interviewId).order("ts_ms"),
      sb.from("interview_analyses").select("*").eq("interview_id", data.interviewId),
      sb.from("interview_notes").select("*").eq("interview_id", data.interviewId),
    ]);
    if (!interview) throw new Error("Interview not found");
    const transcript = (utterances ?? []).map((u: any) => `[${Math.floor(u.ts_ms/1000)}s ${u.speaker}] ${u.text}`).join("\n");
    const grouped: Record<string, any[]> = {};
    for (const a of analyses ?? []) (grouped[a.kind] ||= []).push(a.payload);

    const userPrompt = `Founder: ${interview.founder_name}
Business: ${interview.business_name}
Industry: ${interview.industry ?? "unknown"}

Interviewer private notes:
${(notes ?? []).map((n: any) => `- ${n.section}: ${n.body}`).join("\n") || "(none)"}

Extracted facts:
${JSON.stringify(grouped.fact ?? []).slice(0, 6000)}

Live risk flags:
${JSON.stringify(grouped.risk ?? []).slice(0, 4000)}

Contradictions:
${JSON.stringify(grouped.contradiction ?? []).slice(0, 3000)}

Full transcript:
${transcript.slice(-20000)}
`;
    const report = await callAI(REPORT_SYSTEM, userPrompt);

    await sb.from("interview_reports").insert({ interview_id: data.interviewId, body: report });
    await sb.from("interviews").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", data.interviewId);

    return report;
  });
