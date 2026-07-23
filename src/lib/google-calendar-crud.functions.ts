import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValidGoogleAccessToken } from "@/lib/google-oauth.functions";

type CreateInput = {
  calendarId: string;
  title: string;
  startISO: string;
  endISO: string;
  location?: string;
  description?: string;
};

type UpdateInput = {
  calendarId: string;
  googleEventId: string;
  title?: string;
  startISO?: string;
  endISO?: string;
  location?: string;
  description?: string;
};

type DeleteInput = {
  calendarId: string;
  googleEventId: string;
};

async function callerEmail(context: any): Promise<string> {
  const email = context?.claims?.email as string | undefined;
  if (!email) throw new Error("Not signed in");
  return email;
}

async function mirror(email: string, calendarId: string, ev: any, opts?: { status?: "done" | "cancelled" | "adhoc" | null }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const start_time = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
  const end_time = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null);
  const row: any = {
    user_email: email,
    google_event_id: ev.id,
    calendar_id: calendarId,
    title: ev.summary ?? "(no title)",
    description: ev.description ?? null,
    location: ev.location ?? null,
    meeting_link: ev.hangoutLink ?? ev.conferenceData?.entryPoints?.[0]?.uri ?? null,
    start_time,
    end_time,
    is_all_day: !ev.start?.dateTime,
    updated_at: new Date().toISOString(),
  };
  if (opts?.status !== undefined) row.status = opts.status;
  await (supabaseAdmin.from("google_calendar_events" as any) as any).upsert(row, { onConflict: "user_email,google_event_id" });
}

export const createGoogleCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => d)
  .handler(async ({ data, context }) => {
    const email = await callerEmail(context);
    const token = await getValidGoogleAccessToken(email);
    if (!token) throw new Error("Google not connected for this account");

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(data.calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: data.title,
          location: data.location,
          description: data.description,
          start: { dateTime: data.startISO },
          end: { dateTime: data.endISO },
        }),
      },
    );
    if (!res.ok) throw new Error(`Google create failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    const ev = await res.json();
    await mirror(email, data.calendarId, ev);
    return { id: ev.id as string };
  });

export const updateGoogleCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateInput) => d)
  .handler(async ({ data, context }) => {
    const email = await callerEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await (supabaseAdmin.from("google_calendar_events" as any) as any)
      .select("user_email")
      .eq("google_event_id", data.googleEventId)
      .eq("calendar_id", data.calendarId)
      .maybeSingle();
    if (existing && existing.user_email !== email) throw new Error("Not permitted to edit this event");

    const token = await getValidGoogleAccessToken(email);
    if (!token) throw new Error("Google not connected for this account");

    const body: any = {};
    if (data.title !== undefined) body.summary = data.title;
    if (data.location !== undefined) body.location = data.location;
    if (data.description !== undefined) body.description = data.description;
    if (data.startISO) body.start = { dateTime: data.startISO };
    if (data.endISO) body.end = { dateTime: data.endISO };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(data.calendarId)}/events/${encodeURIComponent(data.googleEventId)}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error(`Google update failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    const ev = await res.json();
    await mirror(email, data.calendarId, ev);
    return { ok: true };
  });

export const deleteGoogleCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: DeleteInput) => d)
  .handler(async ({ data, context }) => {
    const email = await callerEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await (supabaseAdmin.from("google_calendar_events" as any) as any)
      .select("user_email")
      .eq("google_event_id", data.googleEventId)
      .eq("calendar_id", data.calendarId)
      .maybeSingle();
    if (existing && existing.user_email !== email) throw new Error("Not permitted to delete this event");

    const token = await getValidGoogleAccessToken(email);
    if (!token) throw new Error("Google not connected for this account");

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(data.calendarId)}/events/${encodeURIComponent(data.googleEventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 410) {
      throw new Error(`Google delete failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    }
    await (supabaseAdmin.from("google_calendar_events" as any) as any)
      .delete()
      .eq("google_event_id", data.googleEventId)
      .eq("user_email", email);
    return { ok: true };
  });

/** Update the lifecycle status of a synced Google calendar event mirror row.
 *  Google Calendar itself has no equivalent lifecycle field — this is an
 *  Alice Lane-side annotation used only for calendar chip rendering. */
export const setGoogleEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { googleEventId: string; status: "done" | "cancelled" | "adhoc" | null }) => d)
  .handler(async ({ data, context }) => {
    const email = await callerEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("google_calendar_events" as any) as any)
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("google_event_id", data.googleEventId)
      .eq("user_email", email);
    if (error) throw error;
    return { ok: true };
  });

/** Same, for app-native interview/meeting rows. */
export const setInterviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { interviewId: string; status: "done" | "cancelled" | "adhoc" | null }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("interviews" as any) as any)
      .update({ status: data.status })
      .eq("id", data.interviewId);
    if (error) throw error;
    return { ok: true };
  });

/** Same, for public.events rows. */
export const setEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string; status: "done" | "cancelled" | "adhoc" | null }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("events" as any) as any)
      .update({ status: data.status })
      .eq("id", data.eventId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteInterviewRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { interviewId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("interviews" as any) as any)
      .delete()
      .eq("id", data.interviewId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteEventRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("events" as any) as any)
      .delete()
      .eq("id", data.eventId);
    if (error) throw error;
    return { ok: true };
  });

/** Lists the current user's Google calendars where they have write access,
 *  used to populate the "Calendar" dropdown in the new-event dialog. */
export const listWritableCalendars = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await callerEmail(context);
    const token = await getValidGoogleAccessToken(email);
    if (!token) return [] as { id: string; summary: string; primary: boolean }[];
    const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.items ?? []) as any[])
      .filter((c) => c.accessRole === "owner" || c.accessRole === "writer")
      .map((c) => ({
        id: c.id as string,
        summary: (c.summaryOverride ?? c.summary ?? c.id) as string,
        primary: !!c.primary,
      }));
  });
