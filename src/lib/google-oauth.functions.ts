import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}


export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "email",
].join(" ");

export const getGoogleOAuthClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? null };
});

/** Reads this user's stored Google tokens, refreshing the access token first if it's expired. */
export async function getValidGoogleAccessToken(userEmail: string): Promise<string | null> {
  const s = await adminClient();
  const { data: conn } = await s.from("google_oauth_connections").select("*").eq("user_email", userEmail).maybeSingle();
  if (!conn) return null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    return conn.access_token;
  }

  if (!conn.refresh_token) return null;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID/SECRET missing)");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token refresh failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();

  await s.from("google_oauth_connections").update({
    access_token: json.access_token,
    token_expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_email", userEmail);

  return json.access_token;
}

export const getGoogleConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims.email as string | undefined;
    if (!email) return { connected: false, email: null };

    // last_synced_at is new (20260713000000_accounts_calendar_sync.sql) and not yet in the
    // generated Supabase types -- cast until types.ts is regenerated post-migration.
    const { data } = await (context.supabase.from("google_oauth_connections") as any)
      .select("user_email, connected_at, last_synced_at")
      .eq("user_email", email)
      .maybeSingle();
    return {
      connected: !!data,
      email: data?.user_email ?? null,
      connectedAt: data?.connected_at ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
    };
  });

export const disconnectGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims.email as string | undefined;
    if (!email) throw new Error("Not signed in");
    await context.supabase.from("google_oauth_connections").delete().eq("user_email", email);
    return { ok: true };
  });
