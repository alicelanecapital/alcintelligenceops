// AI grading of playbook questions against the live recording/transcript.
//
// Each playbook question carries a grading scorecard (dd_framework_questions.red_flags:
// text + severity). This grades how well the founder answered each question of the
// current step and marks which of those flags it can actually hear evidence for.
// Results are stored as interview_analyses rows (kind = "question_grade") so the
// workspace reads them through the existing analyses query + RLS.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export const GRADE_LABELS = ["A", "B", "C", "D", "E", "Not covered"] as const;
export type QuestionGrade = (typeof GRADE_LABELS)[number];
export type FlagStatus = "Detected" | "Clear" | "Unknown";

export type QuestionGradePayload = {
  step_key: number;
  question_id: string;
  grade: QuestionGrade;
  rationale: string;
  evidence: string;
  flags: { text: string; severity: string | null; status: FlagStatus }[];
  graded_at: string;
};

const SYSTEM = `You are an Alice Lane Capital investment committee AI grading a founder's answers during a live meeting.
For every question you are given, judge ONLY on the transcript provided. Return STRICT JSON:
{
  "grades": [
    {
      "question_id": string,
      "grade": "A"|"B"|"C"|"D"|"E"|"Not covered",
      "rationale": string,
      "evidence": string,
      "flags": [{ "text": string, "status": "Detected"|"Clear"|"Unknown" }]
    }
  ]
}
Grading scale:
A = strong, specific, evidenced answer. B = adequate with minor gaps. C = vague or only partly answered.
D = evasive, deflecting, or contradicted elsewhere in the transcript. E = red flag territory.
"Not covered" = the transcript does not address this question yet — then rationale explains that and evidence MUST be "".
"evidence" is a short verbatim quote from the transcript that you graded on. Never invent quotes or numbers.
For every red flag listed under a question, return the SAME flag text with a status:
"Detected" when the transcript shows evidence of that flag, "Clear" when the transcript shows evidence it is NOT a problem,
"Unknown" when the transcript says nothing either way. Include one entry per listed flag, no extras.
Return a grade object for every question id you were given, in the same order.`;

async function callAI(system: string, user: string): Promise<any> {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
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
  const content = data?.choices?.[0]?.message?.content ?? "";
  try { return JSON.parse(content); } catch { return {}; }
}

function normaliseGrade(v: unknown): QuestionGrade {
  const s = String(v ?? "").trim();
  return (GRADE_LABELS as readonly string[]).includes(s) ? (s as QuestionGrade) : "Not covered";
}

function normaliseStatus(v: unknown): FlagStatus {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "detected") return "Detected";
  if (s === "clear") return "Clear";
  return "Unknown";
}

export const gradeStepQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { interviewId: string; stepKey: number }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [{ data: interview }, { data: utterances }, { data: questions }] = await Promise.all([
      sb.from("interviews").select("*").eq("id", data.interviewId).maybeSingle(),
      sb.from("interview_utterances").select("*").eq("interview_id", data.interviewId).order("ts_ms"),
      sb.from("dd_framework_questions").select("*").eq("round", data.stepKey).order("sort_order"),
    ]);
    if (!interview) throw new Error("Interview not found");
    const qs = (questions ?? []) as any[];
    if (!qs.length) return { graded: 0 };

    const transcript = (utterances ?? [])
      .map((u: any) => `[${Math.floor((u.ts_ms ?? 0) / 1000)}s ${u.speaker}] ${u.text}`)
      .join("\n");
    if (!transcript.trim()) return { graded: 0, reason: "no transcript yet" };

    const questionBlock = qs
      .map((q) => {
        const flags = Array.isArray(q.red_flags) ? q.red_flags : [];
        const flagList = flags.length
          ? flags.map((f: any) => `    - ${f?.text ?? ""}${f?.severity ? ` (${f.severity})` : ""}`).join("\n")
          : "    - (none)";
        return `- question_id: ${q.id}
  question: ${q.question_text}
  why_we_ask: ${q.why_text ?? "n/a"}
  red_flags:
${flagList}`;
      })
      .join("\n");

    const userPrompt = `Founder: ${interview.founder_name ?? "unknown"}
Business: ${interview.business_name ?? "unknown"}
Industry: ${interview.industry ?? "unknown"}

Questions to grade:
${questionBlock}

Transcript:
${transcript.slice(-14000)}
`;

    const result = await callAI(SYSTEM, userPrompt);
    const byId = new Map<string, any>();
    for (const g of Array.isArray(result?.grades) ? result.grades : []) {
      if (g?.question_id) byId.set(String(g.question_id), g);
    }

    const gradedAt = new Date().toISOString();
    const rows = qs
      .map((q) => {
        const g = byId.get(String(q.id));
        if (!g) return null;
        const flags = Array.isArray(q.red_flags) ? q.red_flags : [];
        const statusByText = new Map<string, FlagStatus>();
        for (const f of Array.isArray(g.flags) ? g.flags : []) {
          if (f?.text) statusByText.set(String(f.text).trim().toLowerCase(), normaliseStatus(f.status));
        }
        const payload: QuestionGradePayload = {
          step_key: data.stepKey,
          question_id: String(q.id),
          grade: normaliseGrade(g.grade),
          rationale: String(g.rationale ?? "").slice(0, 600),
          evidence: String(g.evidence ?? "").slice(0, 600),
          flags: flags.map((f: any) => ({
            text: String(f?.text ?? ""),
            severity: f?.severity ? String(f.severity) : null,
            status: statusByText.get(String(f?.text ?? "").trim().toLowerCase()) ?? "Unknown",
          })),
          graded_at: gradedAt,
        };
        return { interview_id: data.interviewId, kind: "question_grade", payload };
      })
      .filter(Boolean) as any[];

    if (rows.length) {
      const { error } = await sb.from("interview_analyses").insert(rows);
      if (error) throw error;
    }
    return { graded: rows.length };
  });
