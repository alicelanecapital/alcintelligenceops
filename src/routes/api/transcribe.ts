// Streaming speech-to-text endpoint.
// Receives an audio file (webm/mp4/wav) from the browser, forwards it to
// the Lovable AI Gateway transcription endpoint, and returns the final
// transcript as JSON. We keep the request simple (non-streaming) so the
// client can just do one fetch per audio chunk.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });
        const inbound = await request.formData();
        const file = inbound.get("file");
        if (!(file instanceof File) && !(file instanceof Blob)) {
          return new Response("file required", { status: 400 });
        }

        // Preserve extension from the client-provided filename or MIME type
        // so the upstream can decode it.
        const name = (file as File).name || "audio.webm";
        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, name);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
        });
      },
    },
  },
});
