import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the "Request information" email straight from the modal via Resend.
 * The sender's saved profile.email_signature is appended to the body.
 * Requires RESEND_API_KEY + RESEND_FROM_EMAIL to be configured; otherwise
 * returns { sent: false, reason } so the UI can offer a friendly fallback.
 */
export const sendRequestInfoEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string; subject: string; body: string; contactId: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.to?.trim()) return { sent: false, reason: "No recipient email on this contact." };

    // Pull the sender's signature
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email_signature, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const signature = (profile as any)?.email_signature?.trim();

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return { sent: false, reason: "Email sending is not configured yet (RESEND_API_KEY / RESEND_FROM_EMAIL missing)." };
    }

    const fullText = signature ? `${data.body}\n\n${signature}` : data.body;
    const html = fullText
      .split("\n")
      .map((l) => l ? `<p style="margin:0 0 0.6em 0">${escapeHtml(l)}</p>` : "<p>&nbsp;</p>")
      .join("");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [data.to], subject: data.subject, html, text: fullText }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Email send failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    return { sent: true };
  });

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
