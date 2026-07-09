import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValidGoogleAccessToken } from "@/lib/google-oauth.functions";

/**
 * Checks the current user's Google Calendar for an event whose title loosely
 * matches the given conference name, within its date range. If found, marks
 * the event "booked" and attributes it to this user. This is the real
 * calendar-based version of the interim manual "Mark booked" toggle.
 */
export const checkEventBookedInCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string; eventName: string; startDate: string; endDate: string }) => d)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    if (!email) throw new Error("Not signed in");

    const accessToken = await getValidGoogleAccessToken(email);
    if (!accessToken) {
      return { booked: false, reason: "not_connected" as const };
    }

    const timeMin = new Date(data.startDate + "T00:00:00Z");
    timeMin.setUTCDate(timeMin.getUTCDate() - 1);
    const timeMax = new Date((data.endDate || data.startDate) + "T23:59:59Z");
    timeMax.setUTCDate(timeMax.getUTCDate() + 1);

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      maxResults: "50",
    });

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Calendar API ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    const items: any[] = json.items ?? [];

    const nameWords = data.eventName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const match = items.find((ev: any) => {
      const summary = (ev.summary ?? "").toLowerCase();
      return nameWords.some((w) => summary.includes(w));
    });

    if (!match) return { booked: false, reason: "no_matching_event" as const };

    const context2 = context;
    await context2.supabase.from("events").update({
      booked: true,
      booked_by: email,
      booked_at: new Date().toISOString(),
    }).eq("id", data.eventId);

    return { booked: true, matchedTitle: match.summary as string };
  });
