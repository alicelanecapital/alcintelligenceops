import { createServerFn } from "@tanstack/react-start";

export type EventIntelInput = {
  name: string;
  city?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  website?: string | null;
};

export type EventIntel = {
  overview: string;
  attendees: string;
  themes: string[];
  notable_speakers: string[];
  deal_flow: string;
  conversation_starters: string[];
};

export const generateEventIntel = createServerFn({ method: "POST" })
  .inputValidator((d: { event: EventIntelInput }) => d)
  .handler(async ({ data }): Promise<EventIntel> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const e = data.event;
    const prompt = `You are a briefing analyst for a South African investment firm. Produce a concise intelligence brief for the following event so a partner can decide whether to attend and how to work the room.

Event: ${e.name}
Location: ${[e.city, e.country].filter(Boolean).join(", ") || "Unknown"}
Dates: ${e.start_date ?? "?"} to ${e.end_date ?? e.start_date ?? "?"}
Description: ${e.description ?? "n/a"}
Website: ${e.website ?? "n/a"}

Return ONLY a JSON object with this exact shape (no markdown, no prose):
{
  "overview": "2-3 sentence overview of the event, its history and why it matters.",
  "attendees": "Who typically attends — seniority level, industries, geographies.",
  "themes": ["4-6 short strings describing the key agenda themes / tracks."],
  "notable_speakers": ["4-6 short strings — real names of notable past/expected speakers or headline organisations."],
  "deal_flow": "1-2 sentences on deal-making potential and what kind of opportunities show up here.",
  "conversation_starters": ["3 short opening lines a partner could use with attendees."]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You return strict JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway failed [${res.status}]: ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return {
      overview: String(parsed.overview ?? ""),
      attendees: String(parsed.attendees ?? ""),
      themes: Array.isArray(parsed.themes) ? parsed.themes.map(String) : [],
      notable_speakers: Array.isArray(parsed.notable_speakers) ? parsed.notable_speakers.map(String) : [],
      deal_flow: String(parsed.deal_flow ?? ""),
      conversation_starters: Array.isArray(parsed.conversation_starters) ? parsed.conversation_starters.map(String) : [],
    };
  });
