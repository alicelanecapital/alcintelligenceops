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
