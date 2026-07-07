import { createServerFn } from "@tanstack/react-start";

export type DiscoveredConference = {
  name: string;
  location: string;
  city?: string;
  country?: string;
  start_date: string;
  end_date: string;
  description: string;
  website: string;
  cost: number;
  who_you_meet: string;
  region: "SA" | "Global";
};

const PROMPT = `You are an expert conference scout for a South African investment firm.

Return TWO lists of upcoming conferences (next 9 months) that match the calibre of Mining Indaba: high prestige, senior/decision-maker attendees, strong deal-making potential, and international influence.

1. "sa": 12 sector-specific conferences hosted IN South Africa across sectors like mining, energy, agri, fintech, healthcare, infrastructure, tech, ESG, private equity.
2. "global": 12 major international conferences (outside South Africa) of comparable prestige that a South African investor / dealmaker should consider attending.

Return ONLY a JSON object with this exact shape (no markdown, no prose):
{
  "sa": [ { "name": "...", "location": "City, Country", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "description": "One sentence on why it matters.", "website": "https://...", "cost": 0, "who_you_meet": "Key attendees, speakers, or target audience." } ],
  "global": [ /* same shape */ ]
}
Costs should be integers in USD (0 if unknown/free).`;

export const discoverEvents = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ sa: DiscoveredConference[]; global: DiscoveredConference[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You return strict JSON only." },
          { role: "user", content: PROMPT },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway failed [${res.status}]: ${body.slice(0, 500)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const normalize = (arr: any[], region: "SA" | "Global"): DiscoveredConference[] =>
      (Array.isArray(arr) ? arr : []).map((c) => {
        const parts = String(c.location ?? "").split(",").map((s: string) => s.trim());
        return {
          name: String(c.name ?? "Untitled"),
          location: String(c.location ?? ""),
          city: parts[0],
          country: parts[1] ?? parts[0],
          start_date: String(c.start_date ?? ""),
          end_date: String(c.end_date ?? c.start_date ?? ""),
          description: String(c.description ?? ""),
          website: String(c.website ?? ""),
          cost: Number(c.cost ?? 0) || 0,
          who_you_meet: String(c.who_you_meet ?? ""),
          region,
        };
      });

    return {
      sa: normalize(parsed.sa, "SA"),
      global: normalize(parsed.global, "Global"),
    };
  },
);
