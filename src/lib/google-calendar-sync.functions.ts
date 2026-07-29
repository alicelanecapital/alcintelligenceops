import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValidGoogleAccessToken } from "@/lib/google-oauth.functions";

export type CalendarSyncReport = {
  synced: number;
  reason: "ok" | "not_connected" | "no_calendars" | "all_calendars_failed";
  calendars: { id: string; name: string; fetched: number; error: string | null }[];
};

/** Core sync worker, shared by the user-triggered server fn and the /api/cron/sync-google-calendars endpoint. */
export async function syncCalendarForUser(email: string): Promise<CalendarSyncReport> {
  const accessToken = await getValidGoogleAccessToken(email);
  if (!accessToken) return { synced: 0, reason: "not_connected", calendars: [] };

  // Pull from every calendar visible in the user's own Google Calendar (not just "primary") --
  // work/shared calendars and auto-generated ones (e.g. Gmail's "Flights" calendar) live under
  // their own calendarId and were previously missed entirely.
  const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!calListRes.ok) {
    const text = await calListRes.text().catch(() => "");
    throw new Error(`Google Calendar list fetch failed [${calListRes.status}]: ${text.slice(0, 300)}`);
  }
  const calListJson = await calListRes.json();
  // NOTE: do NOT filter on `selected !== false`. "Selected" only means the calendar is
  // ticked for display in the Google Calendar UI; an account whose calendars are all
  // unticked silently synced zero events. Only explicit per-account hides apply.
  let calendars: any[] = calListJson.items ?? [];

  // Skip sub-calendars the user has marked private for this account.
  const { supabaseAdmin: adminForHidden } = await import("@/integrations/supabase/client.server");
  const { data: connRow } = await (adminForHidden.from("google_oauth_connections") as any)
    .select("hidden_calendar_ids")
    .eq("user_email", email)
    .maybeSingle();
  const hidden: string[] = connRow?.hidden_calendar_ids ?? [];
  if (hidden.length) calendars = calendars.filter((c: any) => !hidden.includes(c.id));

  if (!calendars.length) return { synced: 0, reason: "no_calendars", calendars: [] };

  const timeMin = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
  const params = new URLSearchParams({
    timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250",
  });

  const rows: any[] = [];
  const report: CalendarSyncReport["calendars"] = [];
  for (const cal of calendars) {
    const calName = cal.summaryOverride ?? cal.summary ?? cal.id;
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      // Don't let one inaccessible calendar (e.g. a shared calendar with restricted event
      // access) fail the whole sync -- but record why so the UI can surface it.
      const text = await res.text().catch(() => "");
      const err = `[${res.status}] ${text.slice(0, 200)}`;
      console.error(`Calendar sync failed for ${email} / ${cal.id}: ${err}`);
      report.push({ id: cal.id, name: calName, fetched: 0, error: err });
      continue;
    }
    const json = await res.json();
    const items: any[] = json.items ?? [];
    let fetched = 0;
    for (const ev of items) {
      const start_time = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
      if (!start_time) continue;
      fetched++;
      rows.push({
        user_email: email,
        google_event_id: ev.id,
        calendar_id: cal.id,
        calendar_name: calName,
        title: ev.summary ?? "(no title)",
        description: ev.description ?? null,
        location: ev.location ?? null,
        meeting_link: ev.hangoutLink ?? ev.conferenceData?.entryPoints?.[0]?.uri ?? null,
        start_time,
        end_time: ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null),
        is_all_day: !ev.start?.dateTime,
        attendees: (ev.attendees ?? []).map((a: any) => ({
          email: a.email, name: a.displayName ?? null, responseStatus: a.responseStatus ?? null,
        })),
        updated_at: new Date().toISOString(),
      });
    }
    report.push({ id: cal.id, name: calName, fetched, error: null });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (rows.length) {
    // The same Google event can appear on more than one sub-calendar (e.g. on
    // primary and on a shared calendar the user is an attendee of). Postgres
    // refuses to update the same conflict target twice in a single upsert
    // ("ON CONFLICT DO UPDATE command cannot affect row a second time"), so
    // dedupe by (user_email, google_event_id), preferring the entry that actually
    // carries the guest list (mirrored copies arrive with attendees stripped),
    // then the primary calendar's copy.
    const byKey = new Map<string, any>();
    for (const r of rows) {
      const key = `${r.user_email}::${r.google_event_id}`;
      const existing = byKey.get(key);
      if (!existing) { byKey.set(key, r); continue; }
      const better =
        (r.attendees?.length ?? 0) > (existing.attendees?.length ?? 0) ||
        ((r.attendees?.length ?? 0) === (existing.attendees?.length ?? 0) && r.calendar_id === email);
      if (better) byKey.set(key, r);
    }
    const deduped = Array.from(byKey.values());
    // google_calendar_events / last_synced_at are new (see 20260713000000_accounts_calendar_sync.sql)
    // and aren't in the generated Supabase types yet -- cast until types.ts is regenerated post-migration.
    const { error } = await (supabaseAdmin.from("google_calendar_events" as any) as any)
      .upsert(deduped, { onConflict: "user_email,google_event_id" });
    if (error) throw error;
  }

  const anySucceeded = report.some((c) => !c.error);
  // Only claim the account is synced when at least one calendar actually came back.
  if (anySucceeded) {
    await (supabaseAdmin.from("google_oauth_connections") as any)
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_email", email);
  }

  return { synced: rows.length, reason: anySucceeded ? "ok" : "all_calendars_failed", calendars: report };
}


/**
 * Syncs a Google account's calendars into google_calendar_events. Defaults to the caller's
 * own connection, but accepts targetEmail so any signed-in teammate can sync any account
 * registered on the Admin > Accounts roster -- e.g. a second Google account of their own
 * registered under a different roster row than their app login.
 */
export const syncGoogleCalendarEvents = createServerFn({ method: "POST" })
  .inputValidator((d?: { targetEmail?: string }) => d ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const sessionEmail = context.claims.email as string | undefined;
    if (!sessionEmail) throw new Error("Not signed in");
    return syncCalendarForUser(data?.targetEmail ?? sessionEmail);
  });

/** Sync every connected Google account in the workspace. Used by the shared "Sync calendars"
 * button on Calendar and Meetings so a signed-in teammate can pull the whole team's calendars,
 * not just their own. */
export const syncAllTeamCalendars = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin.from("google_oauth_connections") as any)
      .select("user_email");
    if (error) throw error;
    const emails = ((data ?? []) as { user_email: string }[]).map((r) => r.user_email);
    let totalSynced = 0;
    const perAccount: { email: string; synced: number; reason: string; calendars: any[] }[] = [];
    for (const email of emails) {
      try {
        const res = await syncCalendarForUser(email);
        totalSynced += res.synced;
        perAccount.push({ email, synced: res.synced, reason: res.reason, calendars: res.calendars });
      } catch (e: any) {
        perAccount.push({ email, synced: 0, reason: `error: ${e?.message ?? "unknown"}`, calendars: [] });
      }
    }
    return { totalSynced, accounts: perAccount };
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

/** Lists every visible sub-calendar under a connected Google account, so Accounts can show them. */
export const listGoogleSubCalendars = createServerFn({ method: "POST" })
  .inputValidator((d: { targetEmail: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const accessToken = await getValidGoogleAccessToken(data.targetEmail);
    if (!accessToken) return [];
    const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await (supabaseAdmin.from("google_oauth_connections") as any)
      .select("hidden_calendar_ids")
      .eq("user_email", data.targetEmail)
      .maybeSingle();
    const hidden: string[] = conn?.hidden_calendar_ids ?? [];
    return ((json.items ?? []) as any[]).map((c) => ({
      id: c.id as string,
      summary: (c.summaryOverride ?? c.summary ?? c.id) as string,
      primary: !!c.primary,
      backgroundColor: (c.backgroundColor ?? null) as string | null,
      accessRole: (c.accessRole ?? "reader") as string,
      hidden: hidden.includes(c.id),
    }));
  });

/** Persist which sub-calendars to exclude from sync for a given connected Google account,
 *  and drop any already-synced events belonging to newly-hidden calendars. */
export const setHiddenCalendars = createServerFn({ method: "POST" })
  .inputValidator((d: { targetEmail: string; hiddenIds: string[] }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("google_oauth_connections") as any)
      .update({ hidden_calendar_ids: data.hiddenIds })
      .eq("user_email", data.targetEmail);
    if (error) throw error;
    if (data.hiddenIds.length) {
      await (supabaseAdmin.from("google_calendar_events" as any) as any)
        .delete()
        .eq("user_email", data.targetEmail)
        .in("calendar_id", data.hiddenIds);
    }
    return { ok: true };
  });

