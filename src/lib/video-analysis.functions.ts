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
using a handful of still frames sampled across the video. You have NO audio -- only images -- so you cannot
actually hear pitch, tone, or speaking pace. Where the categories below ask about energy/excitability/pace,
answer only from visible cues (facial animation, gesture intensity/frequency across frames, mouth movement),
and say plainly that this is inferred from visuals only, not an audio measurement.

Hard rules:
- Never infer honesty, deception, or truthfulness from anything you observe. If asked to, refuse in the relevant field.
- The personality read is a tentative, hedged impression from a handful of stills of one meeting -- not a
  psychological assessment. Phrase it as "appears to..." / "comes across as...", never as a diagnosis or fact.
- Only set a "flag" true when there's something concrete and specific worth the interviewer probing further in
  conversation (e.g. persistent closed posture, no eye contact at all, very limited facial movement) -- not a
  judgment, just a prompt to ask more.
- If frames are too low quality, too dark, or the subject isn't clearly visible, say so plainly instead of guessing.
- Base everything on what's actually visible across the provided frames. Do not speculate beyond them.

Return STRICT JSON:
{
  "expression_summary": string,
    // One paragraph combining facial expressiveness (FACS-inspired plain language -- brow, mouth, jaw
    // tension, not a clinical Action Unit score), eye contact/gaze direction, head nodding/shaking, and hand
    // gestures into a single coherent read -- don't lose any of the specific observations, just merge them
    // into flowing prose instead of separate bullet categories.
  "expression_flag": boolean,
  "posture": { "observation": string, "flag": boolean },
  "energy_and_pace": {
    "observation": string,
      // Movement pace and symmetry, plus any visible cues toward energy/excitability (animated vs. flat,
      // fast vs. deliberate gesture/mouth movement across frames). Explicitly note this is visual-only,
      // not an audio pitch/tone reading.
    "flag": boolean
  },
  "personality_impression": string,
    // Tentative read across: sharing/open vs. guarded/closed, detail-oriented vs. big-picture, risk-averse
    // vs. risk-comfortable, optimistic vs. pessimistic in demeanor -- only where the frames actually suggest
    // something, otherwise say there isn't enough visual signal to say.
  "summary": string
}`;

export const analyzeBehavioralSignals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { interviewId: string; images: string[]; videoPath?: string }) => d)
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
    if (data.videoPath) payload.video_path = data.videoPath;

    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("interview_analyses")
      .insert({ interview_id: data.interviewId, kind: "behavioral_signals", payload })
      .select("id")
      .single();
    if (error) throw error;

    return { ...payload, analysis_id: row.id };
  });
