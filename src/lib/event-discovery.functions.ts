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

const SA_MARKERS = [
  "south africa",
  "cape town",
  "johannesburg",
  "pretoria",
  "durban",
  "sandton",
  "stellenbosch",
  "bloemfontein",
  "port elizabeth",
  "gqeberha",
  "east london",
];

function isSouthAfrican(...values: (string | undefined)[]): boolean {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return SA_MARKERS.some((marker) => haystack.includes(marker));
}

function buildPrompt(today: string): string {
  return `You are an expert conference and events scout for a South African investment firm.

Today's date is ${today}. Only return events starting after today.

Return TWO lists of upcoming high-prestige events (next 9 months from today). Include not just sector conferences, but also flagship events HOSTED OR HEADLINED by top-tier institutions where senior dealmakers gather:

- Investment banks & houses: RMB, Investec, Standard Bank CIB, Absa CIB, Nedbank CIB, JPMorgan, Goldman Sachs, Morgan Stanley, Rothschild, Lazard, Citi, HSBC, Bank of America, Barclays, UBS, Deutsche Bank.
- Global tech & platform companies: Microsoft (Ignite, Build), Google (Cloud Next, I/O), Meta (Connect), AWS (re:Invent, Summit), NVIDIA (GTC), Apple, OpenAI DevDay, Salesforce (Dreamforce), Oracle, IBM.
- Prestige business/policy forums: World Economic Forum (Davos), Milken Institute Global, Bloomberg Invest, FT Live, Economist Impact, Concordia Summit, Aspen Ideas.
- Development finance & PE bodies: IFC, AfDB, SAVCA, AVCA, EMPEA, BVCA.

Quality bar (like Mining Indaba): senior/decision-maker attendees, strong deal-making potential, international influence.

1. "sa": 15 events hosted IN South Africa. Include SA sector conferences (mining, energy, agri, fintech, healthcare, infrastructure, tech, ESG, private equity) AND local editions / roadshows / summits held in Johannesburg, Cape Town, Sandton, etc. by any of the institutions above.
2. "global": 15 major international events (outside South Africa) — flagship bank client conferences, top tech developer/AI summits, WEF/Milken/FT-tier forums, and DFI/PE association summits.

Return ONLY a JSON object with this exact shape (no markdown, no prose):
{
  "sa": [ { "name": "...", "location": "City, Country", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "description": "One sentence on why it matters.", "website": "https://...", "cost": 0, "who_you_meet": "Key attendees, speakers, or target audience." } ],
  "global": [ /* same shape */ ]
}
Costs should be integers in ZAR (South African Rand) — best estimate of per-delegate ticket price (0 if free / invite-only / unknown). All start_date values must be after ${today}.`;
}

export const discoverEvents = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ sa: DiscoveredConference[]; global: DiscoveredConference[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().slice(0, 10);

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
          { role: "user", content: buildPrompt(today) },
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

    const normalize = (arr: any[], defaultRegion: "SA" | "Global"): DiscoveredConference[] =>
      (Array.isArray(arr) ? arr : []).map((c) => {
        const parts = String(c.location ?? "").split(",").map((s: string) => s.trim());
        const city = parts[0];
        const country = parts[1] ?? parts[0];
        // The AI sometimes misfiles an SA-hosted conference under "global" (or vice
        // versa). Re-derive region from the actual city/country text rather than
        // trusting which list the model put it in, so the SA/Global tabs stay accurate.
        const region: "SA" | "Global" = isSouthAfrican(city, country, c.location) ? "SA" : defaultRegion === "SA" ? "SA" : "Global";
        return {
          name: String(c.name ?? "Untitled"),
          location: String(c.location ?? ""),
          city,
          country,
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
