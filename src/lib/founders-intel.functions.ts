// Founder Intelligence — server functions.
// Assembles context from timeline / meetings / notes / tasks / interviews
// and asks Gemini for a structured relationship snapshot.

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
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch { return { raw: content }; }
}

const SYSTEM = `You are the Founder Intelligence engine for Alice Lane Capital's internal investment platform.
Read the founder record and every recent interaction, then return STRICT JSON:
{
  "snapshot": string,
  "recent_developments": [{ "title": string, "detail": string, "when": string }],
  "relationship_health": { "rating": "Cold"|"Warming"|"Warm"|"Hot", "score": number, "reason": string },
  "open_commitments": [{ "party": "us"|"them", "commitment": string, "due": string }],
  "knowledge_gaps": [{ "gap": string, "why_it_matters": string }],
  "next_best_actions": [{ "action": string, "reason": string, "priority": "High"|"Medium"|"Low" }]
}
Be concrete. Reference specific meetings/notes/documents by name. If data is sparse, say so — never invent.`;

export const refreshFounderIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { founderId: string }) => d)
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const [founder, companies, timeline, meetings, notes, tasks, interviews, docs] = await Promise.all([
      db.from("founders").select("*, organisation:organisations(name, industry, category)").eq("id", data.founderId).single(),
      db.from("founder_companies").select("*, company:companies(*)").eq("founder_id", data.founderId),
      db.from("timeline_events").select("*").eq("founder_id", data.founderId).order("occurred_at", { ascending: false }).limit(50),
      db.from("meetings").select("*").eq("founder_id", data.founderId).order("meeting_date", { ascending: false }).limit(10),
      db.from("notes").select("*").eq("founder_id", data.founderId).order("created_at", { ascending: false }).limit(20),
      db.from("tasks").select("*").eq("founder_id", data.founderId).eq("status", "Open"),
      db.from("interviews").select("id, status, started_at, ended_at").eq("founder_id", data.founderId).order("started_at", { ascending: false }).limit(5),
      db.from("documents").select("doc_type, title, ai_summary, created_at").eq("founder_id", data.founderId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (founder.error) throw founder.error;

    const ctx = {
      founder: founder.data,
      companies: companies.data ?? [],
      recent_timeline: timeline.data ?? [],
      meetings: meetings.data ?? [],
      notes: notes.data ?? [],
      open_tasks: tasks.data ?? [],
      interviews: interviews.data ?? [],
      documents: docs.data ?? [],
    };

    const result = await callAI(SYSTEM, JSON.stringify(ctx));

    const now = new Date().toISOString();
    const source_hash = `${timeline.data?.[0]?.id ?? ""}:${notes.data?.[0]?.id ?? ""}:${meetings.data?.[0]?.id ?? ""}`;

    await db.from("founder_intelligence").upsert({
      founder_id: data.founderId,
      snapshot: result.snapshot ?? null,
      recent_developments: result.recent_developments ?? [],
      relationship_health: result.relationship_health ?? {},
      open_commitments: result.open_commitments ?? [],
      knowledge_gaps: result.knowledge_gaps ?? [],
      next_best_actions: result.next_best_actions ?? [],
      source_hash,
      generated_at: now,
    });

    return { ok: true, generated_at: now, ...result };
  });

export const summariseDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; excerpt: string }) => d)
  .handler(async ({ data, context }) => {
    const summary = await callAI(
      "You are an investment analyst. Summarise the following document in <=6 bullet points, calling out numbers, risks, and asks. Return JSON {\"summary\": string, \"bullets\": string[], \"key_numbers\": string[], \"risks\": string[]}",
      data.excerpt.slice(0, 12000),
    );
    await context.supabase.from("documents").update({ ai_summary: JSON.stringify(summary) }).eq("id", data.documentId);
    return summary;
  });

export const generateFounderReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { founderId: string; kind: "founder_summary" | "relationship" | "timeline" }) => d)
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const [founder, timeline, meetings, notes, intel] = await Promise.all([
      db.from("founders").select("*, organisation:organisations(name)").eq("id", data.founderId).single(),
      db.from("timeline_events").select("*").eq("founder_id", data.founderId).order("occurred_at", { ascending: false }).limit(100),
      db.from("meetings").select("*").eq("founder_id", data.founderId).order("meeting_date", { ascending: false }),
      db.from("notes").select("*").eq("founder_id", data.founderId).order("created_at", { ascending: false }),
      db.from("founder_intelligence").select("*").eq("founder_id", data.founderId).maybeSingle(),
    ]);
    return { founder: founder.data, timeline: timeline.data, meetings: meetings.data, notes: notes.data, intel: intel.data, kind: data.kind };
  });
