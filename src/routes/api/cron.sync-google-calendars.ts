// Cron entrypoint: called every 15 minutes (via Supabase pg_cron + pg_net, see
// 20260714000000_booking_links_and_cron_sync.sql) to keep every connected
// team member's calendar fresh without anyone needing the app open.
import { createFileRoute } from "@tanstack/react-router";
import { syncCalendarForUser } from "@/lib/google-calendar-sync.functions";

export const Route = createFileRoute("/api/cron/sync-google-calendars")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SYNC_SECRET;
        if (!secret) return new Response("CRON_SYNC_SECRET not configured", { status: 500 });
        if (request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: connections, error } = await (supabaseAdmin.from("google_oauth_connections") as any)
          .select("user_email");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        const results: Record<string, string> = {};
        for (const conn of connections ?? []) {
          try {
            const r = await syncCalendarForUser(conn.user_email);
            results[conn.user_email] = `${r.reason}:${r.synced}`;
          } catch (e: any) {
            results[conn.user_email] = `error:${e?.message ?? "unknown"}`;
          }
        }

        return new Response(JSON.stringify({ ok: true, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
