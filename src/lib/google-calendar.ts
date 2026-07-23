import { supabase } from "@/integrations/supabase/client";

export async function fetchUpcomingGoogleCalendarEvents() {
  // google_calendar_events is new (20260713000000_accounts_calendar_sync.sql) and not
  // yet in the generated Supabase types -- cast until types.ts is regenerated post-migration.
  const { data, error } = await (supabase.from("google_calendar_events" as any) as any)
    .select("*")
    .gte("start_time", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order("start_time", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as any[];
}

/** Every team member's synced calendar events (any user_email), for matching against event dates on the Current Events screen. */
export async function fetchAllTeamCalendarEvents() {
  const { data, error } = await (supabase.from("google_calendar_events" as any) as any)
    .select("user_email, title, start_time, end_time, google_event_id, calendar_id, location, description, status")
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as {
    user_email: string;
    title: string;
    start_time: string;
    end_time: string | null;
    google_event_id: string;
    calendar_id: string | null;
    location: string | null;
    description: string | null;
    status: "done" | "cancelled" | "postponed" | null;
  }[];
}
