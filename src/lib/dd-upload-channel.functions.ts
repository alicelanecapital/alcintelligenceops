import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValidGoogleAccessToken } from "@/lib/google-oauth.functions";

/**
 * Multi-channel document upload was scoped down to email only (WhatsApp and
 * portal dropped). Each opportunity gets one dedicated inbound address, built
 * as a "+" alias off the team's shared mailbox -- Gmail routes
 * base+anything@domain to the base inbox natively, no extra email
 * infrastructure required. Configure the base mailbox via the
 * UPLOAD_CHANNEL_BASE_EMAIL env var (e.g. "diligence@alicelanecapital.com").
 */
export const getOrCreateUploadChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { opportunityId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("dd_upload_channels")
      .select("*")
      .eq("opportunity_id", data.opportunityId)
      .maybeSingle();
    if (existing) return existing;

    const baseEmail = process.env.UPLOAD_CHANNEL_BASE_EMAIL;
    if (!baseEmail || !baseEmail.includes("@")) {
      throw new Error("UPLOAD_CHANNEL_BASE_EMAIL is not configured (set it to your team's shared inbox, e.g. diligence@alicelanecapital.com)");
    }
    const [local, domain] = baseEmail.split("@");
    const token = data.opportunityId.slice(0, 8);
    const dedicatedEmail = `${local}+dd-${token}@${domain}`;

    const { data: created, error } = await context.supabase
      .from("dd_upload_channels")
      .insert({ opportunity_id: data.opportunityId, channel_type: "email", dedicated_email: dedicatedEmail })
      .select()
      .single();
    if (error) throw error;
    return created;
  });

/**
 * Searches the connected Gmail account for unread mail sent to this
 * opportunity's dedicated address with attachments, downloads the
 * attachments into the dd-documents storage bucket, and files them under
 * the given round's dd_interview_documents. Requires a team member to have
 * connected Google (Gmail readonly scope) via /calendar.
 */
export const syncUploadChannelDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { opportunityId: string; interviewId: string; round: number }) => d)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    if (!email) throw new Error("Not signed in");

    const { data: channel } = await context.supabase
      .from("dd_upload_channels")
      .select("dedicated_email")
      .eq("opportunity_id", data.opportunityId)
      .maybeSingle();
    if (!channel?.dedicated_email) throw new Error("No upload channel found for this opportunity yet");

    const accessToken = await getValidGoogleAccessToken(email);
    if (!accessToken) return { imported: 0, reason: "not_connected" as const };

    // Only pull attachments sent since the last meeting -- for round 1 there's no earlier
    // meeting, so everything sent so far is fair game. Gmail's after:/before: operators
    // accept a Unix timestamp directly, so this doesn't need day-level rounding.
    let sinceClause = "";
    if (data.round > 1) {
      const { data: previousRound } = await context.supabase
        .from("dd_interviews")
        .select("completed_at, started_at")
        .eq("opportunity_id", data.opportunityId)
        .eq("round", data.round - 1)
        .maybeSingle();
      const cutoff = previousRound?.completed_at ?? previousRound?.started_at;
      if (cutoff) sinceClause = ` after:${Math.floor(new Date(cutoff).getTime() / 1000)}`;
    }

    const query = `to:${channel.dedicated_email} has:attachment${sinceClause}`;
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) {
      const body = await listRes.text();
      throw new Error(`Gmail API ${listRes.status}: ${body.slice(0, 300)}`);
    }
    const listJson = await listRes.json();
    const messageIds: string[] = (listJson.messages ?? []).map((m: any) => m.id);

    let imported = 0;
    for (const id of messageIds) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const parts: any[] = msg.payload?.parts ?? [];

      for (const part of parts) {
        if (!part.filename || !part.body?.attachmentId) continue;

        // Skip attachments we've already imported for this message+filename
        const { data: already } = await context.supabase
          .from("dd_interview_documents")
          .select("id")
          .eq("interview_id", data.interviewId)
          .eq("file_name", part.filename)
          .maybeSingle();
        if (already) continue;

        const attRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/attachments/${part.body.attachmentId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!attRes.ok) continue;
        const attJson = await attRes.json();
        // Gmail attachment data is base64url; avoid Node's Buffer since this
        // runs on Cloudflare Workers -- decode via atob instead.
        const base64 = attJson.data.replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const storagePath = `${data.opportunityId}/${Date.now()}-${part.filename}`;
        const { error: uploadError } = await context.supabase.storage
          .from("dd-documents")
          .upload(storagePath, bytes, { contentType: part.mimeType || "application/octet-stream" });
        if (uploadError) continue;

        // Bucket is private (confidential DD documents) -- store the storage
        // path and mint a signed URL on demand when the UI needs to open it,
        // rather than a permanent public URL.
        await context.supabase.from("dd_interview_documents").insert({
          interview_id: data.interviewId,
          round: data.round,
          document_category: "Emailed document",
          file_url: storagePath,
          file_name: part.filename,
          file_size_bytes: part.body.size ?? null,
          upload_channel: "email",
          verification_status: "received",
        });
        imported++;
      }
    }

    return { imported };
  });

/** Mints a short-lived signed URL for a document stored in the private dd-documents bucket. */
export const getSignedDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storagePath: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("dd-documents")
      .createSignedUrl(data.storagePath, 300);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
