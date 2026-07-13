import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValidGoogleAccessToken } from "@/lib/google-oauth.functions";

/** Pulls this user's primary Google Calendar (past week to next 90 days) and upserts into google_calendar_events. */
export const syncGoogleCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims.email as string | undefined;
    if (!email) throw new Error("Not signed in");

    const accessToken = await getValidGoogleAccessToken(email);
    if (!accessToken) return { synced: 0, reason: "not_connected" as const };

    const timeMin = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
    const params = new URLSearchParams({
      timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250",
    });

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Calendar fetch failed [${res.status}]: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const items: any[] = json.items ?? [];

    const rows = items
      .map((ev) => ({
        user_email: email,
        google_event_id: ev.id,
        title: ev.summary ?? "(no title)",
        description: ev.description ?? null,
        location: ev.location ?? null,
        meeting_link: ev.hangoutLink ?? ev.conferenceData?.entryPoints?.[0]?.uri ?? null,
        start_time: ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null),
        end_time: ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null),
        is_all_day: !ev.start?.dateTime,
        attendees: (ev.attendees ?? []).map((a: any) => ({
          email: a.email, name: a.displayName ?? null, responseStatus: a.responseStatus ?? null,
        })),
        updated_at: new Date().toISOString(),
      }))
      .filter((r) => !!r.start_time);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (rows.length) {
      // google_calendar_events / last_synced_at are new (see 20260713000000_accounts_calendar_sync.sql)
      // and aren't in the generated Supabase types yet -- cast until types.ts is regenerated post-migration.
      const { error } = await (supabaseAdmin.from("google_calendar_events" as any) as any)
        .upsert(rows, { onConflict: "user_email,google_event_id" });
      if (error) throw error;
    }

    await (supabaseAdmin.from("google_oauth_connections") as any)
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_email", email);

    return { synced: rows.length, reason: "ok" as const };
  });

/** Admin visibility: every team member who has connected Google, for the Accounts screen. */
export const listTeamGoogleConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin.from("google_oauth_connections") as any)
      .select("user_email, connected_at, last_synced_at")
      .order("user_email");
    if (error) throw error;
    return (data ?? []) as { user_email: string; connected_at: string; last_synced_at: string | null }[];
  });
