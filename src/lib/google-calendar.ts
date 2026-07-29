import { supabase } from "@/integrations/supabase/client";

/** Synced Google events across the last 12 months and everything upcoming.
 *  The Meetings screen needs both Planned and Past sections, so this can no
 *  longer start at "now" — and the old limit of 50 silently truncated the list. */
export async function fetchUpcomingGoogleCalendarEvents() {
  // google_calendar_events is new (20260713000000_accounts_calendar_sync.sql) and not
  // yet in the generated Supabase types -- cast until types.ts is regenerated post-migration.
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const { data, error } = await (supabase.from("google_calendar_events" as any) as any)
    .select("*")
    .gte("start_time", oneYearAgo.toISOString())
    .order("start_time", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as any[];
}

/** Every team member's synced calendar events (any user_email), for matching against event dates on the Current Events screen. */
export async function fetchAllTeamCalendarEvents() {
  const { data, error } = await (supabase.from("google_calendar_events" as any) as any)
    .select("user_email, title, start_time, end_time, google_event_id, calendar_id, calendar_name, location, description, meeting_link, is_all_day, status, attendees")
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as {
    user_email: string;
    title: string;
    start_time: string;
    end_time: string | null;
    google_event_id: string;
    calendar_id: string | null;
    calendar_name: string | null;
    location: string | null;
    description: string | null;
    meeting_link: string | null;
    is_all_day: boolean | null;
    status: "done" | "cancelled" | "postponed" | null;
    attendees: { email?: string; name?: string | null; responseStatus?: string | null }[] | null;
  }[];
}
