import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGoogleConnectionStatus, getGoogleOAuthClientId, GOOGLE_SCOPES } from "@/lib/google-oauth.functions";
import { syncGoogleCalendarEvents, syncAllTeamCalendars } from "@/lib/google-calendar-sync.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Sync/connect button. `mode="team"` pulls every connected workspace account so
 * Calendar and Meetings reflect all teammates' calendars, not just the signed-in
 * user's. Auto-runs on mount if data is stale and every 15 minutes while open --
 * backstop alongside the server-side cron job at /api/cron/sync-google-calendars.
 */
export function SyncGoogleButton({ mode = "self" }: { mode?: "self" | "team" }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const statusFn = useServerFn(getGoogleConnectionStatus);
  const syncFn = useServerFn(syncGoogleCalendarEvents);
  const syncAllFn = useServerFn(syncAllTeamCalendars);
  const status = useQuery({ queryKey: ["google-connection"], queryFn: () => statusFn() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["google-connection"] });
    qc.invalidateQueries({ queryKey: ["upcoming-calendar-meetings"] });
    qc.invalidateQueries({ queryKey: ["all-meetings"] });
    qc.invalidateQueries({ queryKey: ["cal-interviews"] });
    qc.invalidateQueries({ queryKey: ["cal-holidays"] });
    qc.invalidateQueries({ queryKey: ["team-calendar-events"] });
  };

  const syncMut = useMutation({
    mutationFn: async () => (mode === "team" ? await syncAllFn() : await syncFn()),
    onSuccess: (result: any) => {
      const n = mode === "team" ? result.totalSynced : result.synced;
      // Stable sonner id so repeat syncs replace the previous toast instead of stacking.
      toast.success(`Synced ${n} calendar event${n === 1 ? "" : "s"}`, { id: `gcal-sync-${mode}` });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Sync failed", { id: `gcal-sync-${mode}` }),
  });

  // 15-minute backstop while the tab is open, alongside the server-side cron job.
  useEffect(() => {
    if (mode === "self" && !status.data?.connected) return;
    const id = setInterval(() => syncMut.mutate(), FIFTEEN_MINUTES_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.data?.connected, mode]);

  // No auto-run on mount — was firing on every route mount / query invalidation and
  // stacking "Synced N events" toasts every time the user clicked around the calendar.
  // Sync happens on explicit button click + the 15-min interval + the server cron.


  // Surface the redirect result from /auth/google/callback (always lands on /calendar?google=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google account connected");
      qc.invalidateQueries({ queryKey: ["google-connection"] });
    } else if (result === "error") {
      toast.error("Google connection failed: " + (params.get("google_message") ?? "unknown error"));
    }
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    const { clientId } = await getGoogleOAuthClientId();
    if (!clientId) {
      toast.error("Google OAuth isn't configured yet (GOOGLE_OAUTH_CLIENT_ID missing on the server)");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: user?.email ?? "",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const label = mode === "team" ? "Sync calendars" : (status.data?.connected ? "Sync Google" : "Connect Google");
  const onClick = () => {
    if (mode === "team") return syncMut.mutate();
    return status.data?.connected ? syncMut.mutate() : connect();
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={syncMut.isPending}>
      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncMut.isPending ? "animate-spin" : ""}`} />
      {syncMut.isPending ? "Syncing…" : label}
    </Button>
  );
}
