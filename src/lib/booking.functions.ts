import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getValidGoogleAccessToken } from "@/lib/google-oauth.functions";

const SAST_OFFSET_MS = 2 * 3600 * 1000; // South Africa Standard Time, no DST
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const AVAILABILITY_WINDOW_DAYS = 14;

function baseSlug(email: string) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "meet";
}

/**
 * Creates (once) or returns this user's booking link, for the "Booking link" card
 * on the Calendar screen. Uses the caller's own authenticated client (not the
 * service-role admin client) since booking_links RLS already scopes rows to
 * their own user_email -- no elevated privilege is needed here.
 */
export const getOrCreateBookingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims.email as string | undefined;
    if (!email) throw new Error("Not signed in");

    const { data: existing, error: findError } = await (context.supabase.from("booking_links" as any) as any)
      .select("*").eq("user_email", email).maybeSingle();
    if (findError) throw findError;
    if (existing) return existing;

    // Prefer a clean, human-readable slug (email prefix); on collision, append -2, -3, ...
    const base = baseSlug(email);
    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { data, error } = await (context.supabase.from("booking_links" as any) as any)
        .insert({ user_email: email, slug })
        .select("*")
        .single();
      if (!error) return data;
      // 23505 = unique_violation
      if ((error as any).code !== "23505") throw error;
    }
    throw new Error("Couldn't allocate a unique booking slug — please try again.");
  });

/** Public (no auth): computes free 30-min-default slots for the next 2 weeks, business hours only, minus synced calendar busy times and existing bookings. */
export const getBookingAvailability = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error: linkError } = await (supabaseAdmin.from("booking_links" as any) as any)
      .select("*").eq("slug", data.slug).maybeSingle();
    if (linkError) throw linkError;
    if (!link) throw new Error("This booking link wasn't found — please check the URL.");

    const rangeStart = new Date();
    const rangeEnd = new Date(Date.now() + AVAILABILITY_WINDOW_DAYS * 24 * 3600 * 1000);

    const [{ data: busyEvents }, { data: existingBookings }] = await Promise.all([
      (supabaseAdmin.from("google_calendar_events" as any) as any)
        .select("start_time, end_time")
        .eq("user_email", link.user_email)
        .gte("start_time", rangeStart.toISOString())
        .lte("start_time", rangeEnd.toISOString()),
      (supabaseAdmin.from("bookings" as any) as any)
        .select("start_time, end_time")
        .eq("booking_link_id", link.id)
        .eq("status", "confirmed"),
    ]);

    const busy = [...(busyEvents ?? []), ...(existingBookings ?? [])].map((e: any) => ({
      start: new Date(e.start_time).getTime(),
      end: new Date(e.end_time).getTime(),
    }));

    const durationMs = link.duration_minutes * 60 * 1000;
    const slots: string[] = [];

    for (let dayOffset = 0; dayOffset < AVAILABILITY_WINDOW_DAYS; dayOffset++) {
      const day = new Date(rangeStart.getTime() + dayOffset * 24 * 3600 * 1000);
      const sastDay = new Date(day.getTime() + SAST_OFFSET_MS);
      const weekday = sastDay.getUTCDay();
      if (weekday === 0 || weekday === 6) continue; // skip weekends

      const dayStartUtc = Date.UTC(sastDay.getUTCFullYear(), sastDay.getUTCMonth(), sastDay.getUTCDate(), BUSINESS_START_HOUR, 0, 0) - SAST_OFFSET_MS;
      const dayEndUtc = Date.UTC(sastDay.getUTCFullYear(), sastDay.getUTCMonth(), sastDay.getUTCDate(), BUSINESS_END_HOUR, 0, 0) - SAST_OFFSET_MS;

      for (let slotStart = dayStartUtc; slotStart + durationMs <= dayEndUtc; slotStart += durationMs) {
        if (slotStart < Date.now()) continue;
        const slotEnd = slotStart + durationMs;
        const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);
        if (!overlaps) slots.push(new Date(slotStart).toISOString());
      }
    }

    return { title: link.title as string, durationMinutes: link.duration_minutes as number, slots };
  });

/** Public (no auth): confirms a slot, best-effort creates the real Google Calendar event, and logs an internal meeting. */
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; startTime: string; clientName: string; clientEmail: string; notes?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error: linkError } = await (supabaseAdmin.from("booking_links" as any) as any)
      .select("*").eq("slug", data.slug).maybeSingle();
    if (linkError) throw linkError;
    if (!link) throw new Error("This booking link wasn't found — please check the URL.");

    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + link.duration_minutes * 60 * 1000);

    const { data: conflicting } = await (supabaseAdmin.from("bookings" as any) as any)
      .select("id")
      .eq("booking_link_id", link.id)
      .eq("status", "confirmed")
      .lt("start_time", endTime.toISOString())
      .gt("end_time", startTime.toISOString());
    if (conflicting && conflicting.length) {
      throw new Error("That slot was just booked by someone else — please pick another.");
    }

    const { data: booking, error } = await (supabaseAdmin.from("bookings" as any) as any)
      .insert({
        booking_link_id: link.id,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_notes: data.notes ?? null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;

    // Best-effort: block the slot on the real Google Calendar and email the client
    // an invite. The booking is already confirmed internally either way -- track
    // whether the invite actually went out so the client isn't falsely promised one.
    let inviteSent = false;
    try {
      const accessToken = await getValidGoogleAccessToken(link.user_email);
      if (accessToken) {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: `${link.title}: ${data.clientName}`,
            description: data.notes ?? undefined,
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: endTime.toISOString() },
            attendees: [{ email: data.clientEmail, displayName: data.clientName }],
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.id) {
            await (supabaseAdmin.from("bookings" as any) as any).update({ google_event_id: json.id }).eq("id", booking.id);
            inviteSent = true;
          }
        } else {
          console.error(`Google Calendar event creation failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
        }
      }
    } catch (err) {
      console.error("Google Calendar invite step failed:", err);
    }

    await supabaseAdmin.from("meetings").insert({
      title: `Client booking: ${data.clientName}`,
      meeting_date: startTime.toISOString(),
      attendees: [{ name: data.clientName, email: data.clientEmail, external: true }],
      agenda: data.notes ?? null,
      outcome: "Scheduled via booking link",
    });

    return { ok: true, startTime: startTime.toISOString(), endTime: endTime.toISOString(), inviteSent };
  });
