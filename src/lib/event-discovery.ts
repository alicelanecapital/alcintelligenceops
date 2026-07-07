import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function discoverConferences(sector?: string) {
  try {
    const prompt = sector
      ? `Find 15 sector-specific conferences in South Africa similar to Mining Indaba in prestige, seniority of attendees, deal-making potential, and international influence. Sector: ${sector}. Include conferences happening in the next 6 months.`
      : `Find 20 major international conferences in the next 6 months that would interest African investors and entrepreneurs. Include prestige level and expected attendee seniority.`;

    const message = await openai.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt + `\n\nReturn ONLY valid JSON array with this structure (no markdown, no extra text):\n[\n  {\n    "name": "Conference Name",\n    "location": "City, Country",\n    "start_date": "2026-MM-DD",\n    "end_date": "2026-MM-DD",
    "description": "Brief description",\n    "website": "https://...",\n    "cost": 1000,\n    "who_you_meet": "Target attendee types",\n    "is_new": true,\n    "region": "SA" or "Global"\n  }\n]`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", responseText);
      return [];
    }

    const conferences = JSON.parse(jsonMatch[0]);
    return conferences;
  } catch (error) {
    console.error("Event discovery error:", error);
    throw error;
  }
}
