// DD Sector Detection & AI Analysis
// Auto-detects business sector, analyzes documents, detects red flags.
// All AI calls run server-side via the Lovable AI Gateway (same pattern as interviews.functions.ts)
// so no API key is ever exposed to the browser bundle.

import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

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
  const content = data?.choices?.[0]?.message?.content ?? "";
  try { return JSON.parse(content); }
  catch { return { raw: content }; }
}

export interface SectorDetectionResult {
  sector: "A" | "B" | "C" | "D" | "E" | null;
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export interface DocumentAnalysis {
  extractedData: Record<string, string | number | boolean>;
  redFlags: string[];
  verificationClaims: Array<{ claim: string; source: string }>;
  followUpQuestions: string[];
  confidence: number;
}

export interface VoiceAnalysis {
  confidenceLevel: number;
  hesitationMarkers: number;
  discomfortIndicators: number;
  speakingPace: "rapid" | "measured" | "slow";
  contradictions: Array<{ claim1: string; claim2: string }>;
  assessment: "confident" | "evasive" | "uncertain";
}

const SECTOR_KEYWORDS: Record<string, string[]> = {
  A: ["cleaning", "staffing", "logistics", "field service", "labor", "workers", "scheduling", "dispatch"],
  B: ["retail", "e-commerce", "marketplace", "store", "inventory", "shopping", "catalog", "orders"],
  C: ["food", "restaurant", "delivery", "catering", "chef", "menu", "kitchen", "dining"],
  D: ["software", "saas", "app", "platform", "api", "cloud", "code", "developer", "subscription"],
  E: ["manufacturing", "hardware", "production", "factory", "supply chain", "component", "assembly"],
};

function keywordFallback(responses: string[]): SectorDetectionResult {
  const combinedText = responses.join(" ").toLowerCase();
  const sectorScores: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const foundKeywords: string[] = [];

  Object.entries(SECTOR_KEYWORDS).forEach(([sector, keywords]) => {
    keywords.forEach((keyword) => {
      if (combinedText.includes(keyword)) {
        sectorScores[sector]++;
        foundKeywords.push(keyword);
      }
    });
  });

  const topSector = Object.entries(sectorScores).sort(([, a], [, b]) => b - a)[0];
  return {
    sector: topSector[1] > 0 ? (topSector[0] as SectorDetectionResult["sector"]) : null,
    confidence: Math.min(topSector[1] * 20, 95),
    reasoning: foundKeywords.length ? `Detected based on keyword matching: ${foundKeywords.slice(0, 3).join(", ")}` : "No strong signal yet",
    keywords: foundKeywords,
  };
}

/** Detects business sector from founder responses. Runs server-side. */
export const detectSector = createServerFn({ method: "POST" })
  .inputValidator((d: { responses: string[] }) => d)
  .handler(async ({ data }): Promise<SectorDetectionResult> => {
    const fallback = keywordFallback(data.responses);
    try {
      const prompt = `Analyze these founder responses and determine the business sector.
Sectors: A=Physical Service, B=Retail, C=Food, D=Software, E=Manufacturing
Responses: ${data.responses.slice(0, 3).join(" ")}

Return JSON: { "sector": "A"|"B"|"C"|"D"|"E", "confidence": 0-100, "reasoning": "..." }`;
      const result = await callAI("You are a due diligence analyst classifying SME businesses by sector.", prompt);
      if (!result.sector) return fallback;
      return {
        sector: result.sector,
        confidence: result.confidence ?? fallback.confidence,
        reasoning: result.reasoning ?? fallback.reasoning,
        keywords: fallback.keywords,
      };
    } catch {
      return fallback;
    }
  });

/** Analyzes uploaded document text for red flags and extracts data. Runs server-side. */
export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; documentType: string }) => d)
  .handler(async ({ data }): Promise<DocumentAnalysis> => {
    const prompt = `Analyze this ${data.documentType} document for red flags and extract key data.

Document: ${data.text.substring(0, 4000)}

Return JSON with:
{
  "redFlags": ["flag1", "flag2"],
  "extractedData": { "revenue": "...", "margin": "...", "churn": "..." },
  "verificationClaims": [{ "claim": "...", "source": "..." }],
  "followUpQuestions": ["question1", "question2"],
  "confidence": 0-100
}`;
    try {
      const result = await callAI("You are a due diligence analyst reviewing SME founder documents.", prompt);
      return {
        extractedData: result.extractedData ?? {},
        redFlags: result.redFlags ?? [],
        verificationClaims: result.verificationClaims ?? [],
        followUpQuestions: result.followUpQuestions ?? [],
        confidence: result.confidence ?? 50,
      };
    } catch {
      return { extractedData: {}, redFlags: ["Unable to fully analyze document"], verificationClaims: [], followUpQuestions: [], confidence: 0 };
    }
  });

/** Saves document analysis to Supabase (client-side DB write, no secrets involved). */
export async function saveDocumentAnalysis(
  interviewId: string,
  round: number,
  documentType: string,
  analysis: DocumentAnalysis,
): Promise<void> {
  await supabase.from("dd_interview_documents").insert({
    interview_id: interviewId,
    round,
    document_category: documentType,
    auto_analysis: analysis,
    verification_status: "reviewed",
    parsed_data: analysis.extractedData,
  } as any);
}

/** Analyzes voice characteristics from transcript. Runs server-side. */
export const analyzeVoiceCharacteristics = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string }) => d)
  .handler(async ({ data }): Promise<VoiceAnalysis> => {
    const filler = (data.transcript.match(/\b(um|uh|like|you know|so|basically)\b/gi) || []).length;
    const sentences = (data.transcript.match(/[^.!?]*[.!?]/g) || []);
    const shortResponses = sentences.filter((s) => s.length < 50).length;
    const totalResponses = sentences.length || 1;

    const prompt = `Analyze this founder interview transcript for voice characteristics and confidence.

Transcript: ${data.transcript.substring(0, 4000)}

Return JSON:
{
  "confidenceLevel": 0-100,
  "discomfortIndicators": 0-10,
  "contradictions": [{ "claim1": "...", "claim2": "..." }],
  "assessment": "confident"|"evasive"|"uncertain"
}`;
    try {
      const result = await callAI("You are an experienced investor assessing founder credibility from interview transcripts.", prompt);
      return {
        confidenceLevel: result.confidenceLevel ?? 50,
        hesitationMarkers: filler,
        discomfortIndicators: result.discomfortIndicators ?? 0,
        speakingPace: filler > totalResponses * 0.15 ? "rapid" : "measured",
        contradictions: result.contradictions ?? [],
        assessment: result.assessment ?? "uncertain",
      };
    } catch {
      return {
        confidenceLevel: 50,
        hesitationMarkers: filler,
        discomfortIndicators: shortResponses > totalResponses * 0.4 ? 5 : 2,
        speakingPace: "measured",
        contradictions: [],
        assessment: "uncertain",
      };
    }
  });

/** Generates AI-powered follow-up questions based on transcript and sector. Runs server-side. */
export const generateFollowUpQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string; sector: string; round: number }) => d)
  .handler(async ({ data }): Promise<string[]> => {
    const prompt = `Based on this founder interview for a ${data.sector} company in round ${data.round},
generate 3 thoughtful follow-up questions that probe deeper into concerns or unclear areas.

Transcript: ${data.transcript.substring(0, 3000)}

Return JSON: { "questions": ["question1", "question2", "question3"] }`;
    try {
      const result = await callAI("You are a due diligence interviewer preparing sharp follow-up questions.", prompt);
      return Array.isArray(result.questions) ? result.questions : [];
    } catch {
      return [
        "Can you provide more detail on your customer acquisition strategy?",
        "How do you plan to address the competitive risks you mentioned?",
        "What would cause you to pivot your business model?",
      ];
    }
  });

/** Detects red flags from transcript and document analyses. Runs server-side. */
export const detectRedFlags = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string; documentRedFlags: string[]; sector: string }) => d)
  .handler(async ({ data }): Promise<Array<{ text: string; severity: "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR" }>> => {
    const redFlags: Array<{ text: string; severity: "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR" }> = data.documentRedFlags.map((flag) => ({
      text: flag,
      severity: "MONITOR" as const,
    }));

    const prompt = `Identify red flags in this ${data.sector} company interview that would concern an investor.
Classify each as: WALK_AWAY (fatal flaw), PRICE_IT_IN (manageable), or MONITOR (watch closely).

Transcript: ${data.transcript.substring(0, 4000)}

Return JSON: { "flags": [{ "text": "...", "severity": "WALK_AWAY"|"PRICE_IT_IN"|"MONITOR" }] }`;
    try {
      const result = await callAI("You are an investment committee analyst identifying deal-breaking or manageable risks.", prompt);
      if (Array.isArray(result.flags)) redFlags.push(...result.flags);
    } catch {
      if (data.transcript.toLowerCase().includes("running out of cash") || data.transcript.toLowerCase().includes("runway")) {
        redFlags.push({ text: "Potential runway concerns mentioned", severity: "WALK_AWAY" });
      }
      if (data.transcript.toLowerCase().includes("team is leaving") || data.transcript.toLowerCase().includes("key person")) {
        redFlags.push({ text: "Key person risk identified", severity: "PRICE_IT_IN" });
      }
    }

    const uniqueFlags = Array.from(new Map(redFlags.map((f) => [f.text, f])).values());
    return uniqueFlags.slice(0, 5);
  });

/** Generates a comprehensive AI analysis report for a round. Runs server-side. */
export const generateAnalysisReport = createServerFn({ method: "POST" })
  .inputValidator((d: { interviewId: string; transcript: string; sector: string; round: number }) => d)
  .handler(async ({ data }) => {
    const [voiceAnalysis, followUpQuestions, redFlags] = await Promise.all([
      analyzeVoiceCharacteristics({ data: { transcript: data.transcript } }),
      generateFollowUpQuestions({ data: { transcript: data.transcript, sector: data.sector, round: data.round } }),
      detectRedFlags({ data: { transcript: data.transcript, documentRedFlags: [], sector: data.sector } }),
    ]);

    let sectorInsights: string[] = [];
    try {
      const prompt = `Given this ${data.sector} company interview, provide 2-3 sector-specific insights for due diligence.

Transcript excerpt: ${data.transcript.substring(0, 2000)}

Return JSON: { "insights": ["insight1", "insight2", "insight3"] }`;
      const result = await callAI("You are a due diligence analyst providing sector-specific insights.", prompt);
      sectorInsights = Array.isArray(result.insights) ? result.insights : [];
    } catch {
      sectorInsights = [`Continue probing ${data.sector}-specific unit economics`];
    }

    return { redFlags, followUpQuestions, voiceAnalysis, sectorInsights };
  });
