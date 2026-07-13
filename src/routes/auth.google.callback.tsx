import { createFileRoute } from "@tanstack/react-router";


export const Route = createFileRoute("/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateEmail = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        const redirectTo = (status: "connected" | "error", message?: string) => {
          const dest = new URL("/calendar", url.origin);
          dest.searchParams.set("google", status);
          if (message) dest.searchParams.set("google_message", message);
          return Response.redirect(dest.toString(), 302);
        };

        if (error) return redirectTo("error", error);
        if (!code || !stateEmail) return redirectTo("error", "missing_code_or_state");

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) return redirectTo("error", "google_oauth_not_configured");

        const redirectUri = `${url.origin}/auth/google/callback`;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenRes.ok) {
          const body = await tokenRes.text();
          return redirectTo("error", `token_exchange_failed: ${body.slice(0, 200)}`);
        }

        const tokens = await tokenRes.json();
        const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { error: dbError } = await supabase.from("google_oauth_connections").upsert({
          user_email: stateEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? undefined,
          token_expires_at: expiresAt,
          scope: tokens.scope ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_email" });

        if (dbError) return redirectTo("error", dbError.message);

        return redirectTo("connected");
      },
    },
  },
});
