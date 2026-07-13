import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

export type ExtractedBusinessCard = {
  name: string | null;
  company: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  category: "founder" | "investor" | "ecosystem" | "vendor" | "unknown";
  categoryConfidence: number;
  categoryReasoning: string;
};

const SYSTEM_PROMPT = `You are an assistant that reads business card photos for an investment firm's CRM.

Only one side of the card is photographed -- typically the side with the
person's name, phone number, and website, which often does NOT print an
explicit "Company Name:" line. Intuit the company name rather than
requiring it to be printed outright:
- Prefer any logo wordmark or heading text at the top of the card.
- Otherwise infer it from the website domain (e.g. "acmewidgets.co.za" implies "Acme Widgets") or the email domain, stripping the TLD and formatting it as a plausible business name.
- Only return null for company if there is truly no name, no website, and no email domain to infer from.

Extract the contact's details, then classify them into exactly one category based on their job title, company name, and any other visible context:
- "founder": runs/owns an SME or startup that could be an investment target
- "investor": VC, angel investor, fund, or investment committee member
- "ecosystem": NGO, accelerator, incubator, government body, foundation, or other ecosystem partner
- "vendor": service provider (legal, accounting, consulting, etc.) not itself an investment target
- "unknown": genuinely unclear from the card alone

Return STRICT JSON only, no markdown, no prose:
{
  "name": "...", "company": "...", "position": "...", "email": "...", "phone": "...", "website": "...", "linkedin": "...",
  "category": "founder"|"investor"|"ecosystem"|"vendor"|"unknown",
  "categoryConfidence": 0-100,
  "categoryReasoning": "one short sentence"
}
Use null for any field you can't read. If confidence in the category is below 60, set category to "unknown".`;

export const extractBusinessCard = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string; mimeType: string }) => d)
  .handler(async ({ data }): Promise<ExtractedBusinessCard> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract this business card's details and classify the contact." },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway ${res.status}: ${body.slice(0, 400)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any = {};
    const extractFirstJsonObject = (s: string): string | null => {
      const start = s.indexOf("{");
      if (start === -1) return null;
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < s.length; i++) {
        const ch = s[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === "\\") esc = true;
          else if (ch === '"') inStr = false;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === "{") depth++;
          else if (ch === "}") { depth--; if (depth === 0) return s.slice(start, i + 1); }
        }
      }
      return null;
    };
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const obj = extractFirstJsonObject(cleaned);
      if (obj) { try { parsed = JSON.parse(obj); } catch { parsed = {}; } }
    }

    const category = ["founder", "investor", "ecosystem", "vendor"].includes(parsed.category) ? parsed.category : "unknown";
    const confidence = Number(parsed.categoryConfidence ?? 0);

    return {
      name: parsed.name ?? null,
      company: parsed.company ?? null,
      position: parsed.position ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      website: parsed.website ?? null,
      linkedin: parsed.linkedin ?? null,
      category: confidence < 60 ? "unknown" : category,
      categoryConfidence: confidence,
      categoryReasoning: parsed.categoryReasoning ?? "",
    };
  });
