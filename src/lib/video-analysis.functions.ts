// AI-assisted behavioral observation from uploaded interview video frames.
//
// Deliberately scoped to observable, descriptive signals only -- facial expressiveness,
// gaze/eye contact, head movement, posture, gestures, movement pace -- framed the same way
// as the existing interviewer "Observations" panel: things worth probing further in
// conversation, never a verdict. This does NOT attempt deception/lie detection: claims that
// eye-movement direction reveals truth-telling (the NLP "eye-accessing cues" theory) have
// been tested and consistently fail to replicate, so no such inference is made here.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `You are assisting an investor with in-person behavioral observations during a founder interview,
using a handful of still frames sampled across the video. Describe only what is visibly observable in these
categories: facial expressiveness (FACS-inspired, in plain language -- e.g. brow, mouth, jaw tension, not a
clinical Action Unit score), eye contact and gaze direction, head nodding/shaking, body posture, hand gestures,
and movement pace/symmetry.

Hard rules:
- Never infer honesty, deception, or truthfulness from anything you observe. If asked to, refuse in the "summary" field.
- Only set "flag": true for a category if there's something concrete and specific worth the interviewer probing
  further in conversation (e.g. persistent closed posture, no eye contact at all, very limited facial movement) --
  not as a judgment, just a prompt to ask more.
- If frames are too low quality, too dark, or the subject isn't clearly visible, say so plainly instead of guessing.
- Base everything on what's actually visible across the provided frames. Do not speculate beyond them.

Return STRICT JSON:
{
  "facial_expressiveness": { "observation": string, "flag": boolean },
  "eye_contact_and_gaze": { "observation": string, "flag": boolean },
  "head_movement": { "observation": string, "flag": boolean },
  "posture": { "observation": string, "flag": boolean },
  "hand_gestures": { "observation": string, "flag": boolean },
  "movement_pace_and_symmetry": { "observation": string, "flag": boolean },
  "summary": string
}`;

export const analyzeBehavioralSignals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { interviewId: string; images: string[] }) => d)
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    if (!data.images?.length) throw new Error("No video frames to analyze");

    const content: any[] = [
      { type: "text", text: "Analyze these frames sampled from a founder interview video." },
      ...data.images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
    }
    const raw = await res.json();
    let payload: any;
    try { payload = JSON.parse(raw?.choices?.[0]?.message?.content ?? "{}"); }
    catch { throw new Error("Could not parse the behavioral analysis response"); }

    const sb = context.supabase as any;
    await sb.from("interview_analyses").insert({ interview_id: data.interviewId, kind: "behavioral_signals", payload });

    return payload;
  });
