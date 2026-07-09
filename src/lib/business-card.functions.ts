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
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
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
